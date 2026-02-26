/**
 * KnowledgeEditor
 * 
 * Simplified article editor for Knowledge Base.
 * Uses 'documents' table.
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { sanitizeHtml } from '@/lib/sanitize'
import { renderMermaidDiagrams, transformMermaidCodeBlocks } from '@/lib/mermaid'
import {
    Save,
    Send,
    Sparkles,
    Loader2,
    ArrowLeft,
    Wand2,
    RefreshCw,
    Link as LinkIcon,
    Clock,
    List,
    ShieldCheck,
    Building2,
    Palette,
    AlertTriangle,
    Tag,
    X
} from 'lucide-react'
import { marked } from 'marked'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import RichTextEditor from '@/components/ui/RichTextEditor'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { MultiDepartmentSelector } from '@/components/shared/MultiDepartmentSelector'
import { GroupedDepartmentSelector } from '@/components/shared/GroupedDepartmentSelector'
import {
    type KnowledgeVisibility,
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
import { useDuplicateDetection } from '@/hooks/useDuplicateDetection'
import { useTagSuggestions } from '@/hooks/useTagSuggestions'

import { useArticleForm } from './hooks/useArticleForm'
import { useArticlePersistence } from './hooks/useArticlePersistence'
import { useAIService } from './hooks/useAIService'

export default function KnowledgeEditor() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { t } = useTranslation(['knowledge', 'common'])
    const { primaryRole } = useAuth()
    const { currentProperty } = useProperty()
    const isEditing = Boolean(id) && id !== 'new'

    // 1. Form State Management
    const {
        formData,
        setFormData,
        updateField,
        validationWarnings,
        visibilitySummary,
        uniqueDepartmentNames,
        departments,
        properties
    } = useArticleForm()

    // 2. Persistence & Upload
    const {
        isSaving,
        isUploading,
        saveArticle,
        handleFileUpload
    } = useArticlePersistence(formData, updateField, setFormData, id)

    // 3. AI Services
    const {
        isGenerating,
        aiLanguage,
        setAiLanguage,
        beautifyOptions,
        setBeautifyOptions,
        generateWithAI,
        beautifyArticle
    } = useAIService(formData, updateField)

    // 4. Other Data & UI State
    const { data: relatedArticles = [], refetch: refetchRelated } = useRelatedArticles(id || '')
    const { data: categories } = useCategories(formData.department_id || undefined)

    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
    const previewRef = useRef<HTMLDivElement>(null)
    const [isForbidden, setIsForbidden] = useState(false)

    // Duplicate detection
    const { checkForDuplicates, isReady, result: duplicateResult } = useDuplicateDetection()
    const { suggestions: tagSuggestions, isGenerating: isGeneratingTags, generateSuggestions, clearSuggestions } = useTagSuggestions()
    const [duplicateCheckResult, setDuplicateCheckResult] = useState<{ duplicates: Array<{ id: string; title: string; similarity: number; content_type: string }>; hasDuplicates: boolean } | null>(null)
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
    const [dismissedDuplicateTitle, setDismissedDuplicateTitle] = useState<string | null>(null)

    // Check for duplicates logic
    useEffect(() => {
        if (!isReady || formData.title.length < 5 || isEditing) {
            // Avoid setting state synchronously if not needed or check conditions carefully
             setDuplicateCheckResult(null)
             setShowDuplicateWarning(false)
            return
        }

        const timer = setTimeout(() => {
            checkForDuplicates(formData.title)
        }, 500)

        return () => clearTimeout(timer)
    }, [formData.title, isReady, isEditing, checkForDuplicates])

    useEffect(() => {
        // Use functional update or only update if changed to avoid loop
        if (duplicateResult !== duplicateCheckResult) {
             setDuplicateCheckResult(duplicateResult)
        }

        if (duplicateResult?.hasDuplicates) {
            if (formData.title !== dismissedDuplicateTitle) {
                setShowDuplicateWarning(true)
            }
        } else {
            setShowDuplicateWarning(false)
        }
    }, [duplicateResult, formData.title, dismissedDuplicateTitle, duplicateCheckResult])

    // Preview logic
    const previewHtml = useMemo(() => {
        const raw = formData.content || ''
        if (!raw.trim()) return `<p class="text-gray-400">${t('editor.empty_preview')}</p>`
        const isHtml = raw.trim().startsWith('<')
        const html = isHtml ? raw : (marked.parse(raw, { async: false }) as string)
        return transformMermaidCodeBlocks(html)
    }, [formData.content, t])

    useEffect(() => {
        if (activeTab !== 'preview') return
        void renderMermaidDiagrams(previewRef.current)
    }, [activeTab, previewHtml])

    // Permission check
    useEffect(() => {
        if (primaryRole === 'staff') {
             // Redirecting immediately is better than rendering forbidden state if possible,
             // but here we just set state.
             // To avoid setState in effect warning if possible, we could check before render,
             // but primaryRole comes from hook.
            setIsForbidden(true)
            toast.error('You do not have permission to create or edit articles.')
            navigate('/knowledge/search')
        }
    }, [primaryRole, navigate])

    const VISIBILITY_OPTIONS: { value: KnowledgeVisibility; label: string; description: string }[] = [
        {
            value: 'all_properties' as KnowledgeVisibility,
            label: t('editor.visibility.simple_all_hotels', 'Everyone in all hotels'),
            description: t('editor.visibility.simple_all_hotels_desc', 'All active staff across all hotels can view this.')
        },
        {
            value: 'property',
            label: t('editor.visibility.simple_one_hotel', 'Everyone in one hotel'),
            description: t('editor.visibility.simple_one_hotel_desc', 'All staff in one selected hotel can view this.')
        },
        {
            value: 'department',
            label: t('editor.visibility.simple_team_one_hotel', 'One team in one hotel'),
            description: t('editor.visibility.simple_team_one_hotel_desc', 'Only one team in one selected hotel can view this.')
        },
        {
            value: 'group_department',
            label: t('editor.visibility.simple_team_all_hotels', 'Same team in all hotels'),
            description: t('editor.visibility.simple_team_all_hotels_desc', 'One team can view this across every hotel.')
        },
        {
            value: 'specific_departments',
            label: t('editor.visibility.simple_custom', 'Custom teams'),
            description: t('editor.visibility.simple_custom_desc', 'Pick specific teams from different hotels.')
        },
        {
            value: 'role',
            label: t('editor.visibility.simple_role_advanced', 'By role (Advanced)'),
            description: t('editor.visibility.simple_role_advanced_desc', 'Use role-based visibility rules.')
        },
    ]

    if (isForbidden || primaryRole === 'staff') {
        return null
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

                    {['department_head', 'property_hr', 'property_manager'].includes(primaryRole || '') && (
                        <Button
                            onClick={() => saveArticle('PENDING_REVIEW')}
                            disabled={isSaving || isUploading}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white"
                        >
                            {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Clock className="h-4 w-4 mr-2" />}
                            {t('editor.submit_for_review')}
                        </Button>
                    )}

                    {['property_manager', 'regional_admin', 'corporate_admin'].includes(primaryRole || '') && (
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

                                {/* Duplicate Detection Warning */}
                                {showDuplicateWarning && duplicateCheckResult?.hasDuplicates && (
                                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-amber-800">
                                                    {t('editor.duplicate_warning', 'Similar articles already exist')}
                                                </p>
                                                <ul className="mt-2 space-y-1">
                                                    {duplicateCheckResult.duplicates.slice(0, 3).map(dup => (
                                                        <li key={dup.id} className="text-xs text-amber-700 flex items-center justify-between">
                                                            <span className="truncate flex-1">• {dup.title}</span>
                                                            <Badge variant="outline" className="ml-2 text-[10px]">{dup.similarity}% match</Badge>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="mt-2 h-7 text-xs text-amber-700 hover:text-amber-900"
                                                    onClick={() => {
                                                        setShowDuplicateWarning(false)
                                                        setDismissedDuplicateTitle(formData.title)
                                                    }}
                                                >
                                                    {t('editor.dismiss_warning', 'Dismiss')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* AI Tag Suggestions */}
                                {!isEditing && formData.title.length > 10 && tagSuggestions.length === 0 && !isGeneratingTags && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-indigo-600 hover:text-indigo-700"
                                            onClick={() => generateSuggestions(formData.title, formData.content, formData.description)}
                                        >
                                            <Tag className="w-3 h-3 mr-1" />
                                            {t('editor.suggest_tags', 'AI: Suggest tags')}
                                        </Button>
                                    </div>
                                )}

                                {isGeneratingTags && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        {t('editor.generating_tags', 'Generating tag suggestions...')}
                                    </div>
                                )}

                                {tagSuggestions.length > 0 && (
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-slate-500">{t('editor.suggested_tags', 'Suggested tags:')}</span>
                                        {tagSuggestions.map((suggestion, idx) => (
                                            <Badge
                                                key={idx}
                                                variant="outline"
                                                className={`text-[10px] cursor-pointer hover:bg-indigo-50 ${suggestion.confidence === 'high' ? 'border-green-300 text-green-700' :
                                                        suggestion.confidence === 'medium' ? 'border-blue-300 text-blue-700' :
                                                            'border-slate-300 text-slate-600'
                                                    }`}
                                                title={suggestion.reason}
                                            >
                                                {suggestion.tag}
                                            </Badge>
                                        ))}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0"
                                            onClick={clearSuggestions}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                )}
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
                                        onChange={handleFileUpload}
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
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => beautifyArticle()}
                                    disabled={isGenerating || !formData.content}
                                    className="border-purple-500 hover:border-purple-600 text-purple-600"
                                >
                                    <Palette className="h-4 w-4" /> AI Beautify
                                </Button>
                            </div>

                            <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                                <div className="text-xs font-medium text-slate-600 mb-2">
                                    {t('editor.beautify_options', 'Beautify Options')}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <label className="flex items-center justify-between text-xs text-slate-700">
                                        <span>{t('editor.include_tables', 'Include Tables')}</span>
                                        <Switch
                                            checked={beautifyOptions.includeTables}
                                            onCheckedChange={(val) => setBeautifyOptions(prev => ({ ...prev, includeTables: val }))}
                                        />
                                    </label>
                                    <label className="flex items-center justify-between text-xs text-slate-700">
                                        <span>{t('editor.include_mermaid', 'Include Mermaid Diagrams')}</span>
                                        <Switch
                                            checked={beautifyOptions.includeMermaid}
                                            onCheckedChange={(val) => setBeautifyOptions(prev => ({ ...prev, includeMermaid: val }))}
                                        />
                                    </label>
                                    <label className="flex items-center justify-between text-xs text-slate-700">
                                        <span>{t('editor.include_callouts', 'Include Callouts')}</span>
                                        <Switch
                                            checked={beautifyOptions.includeCallouts}
                                            onCheckedChange={(val) => setBeautifyOptions(prev => ({ ...prev, includeCallouts: val }))}
                                        />
                                    </label>
                                    <label className="flex items-center justify-between text-xs text-slate-700">
                                        <span>{t('editor.include_toc', 'Include Table of Contents')}</span>
                                        <Switch
                                            checked={beautifyOptions.includeTOC}
                                            onCheckedChange={(val) => setBeautifyOptions(prev => ({ ...prev, includeTOC: val }))}
                                        />
                                    </label>
                                </div>
                                {beautifyOptions.includeMermaid && (
                                    <p className="mt-2 text-[11px] text-slate-500">
                                        {t('editor.mermaid_preview_note', 'Mermaid diagrams render in Preview mode.')}
                                    </p>
                                )}
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
                                <div ref={previewRef} className="prose max-w-none min-h-[400px] p-4 border rounded bg-white">
                                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }} />

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
                    {/* 1. Categorization */}
                    <Card className="border-hotel-navy/10 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <List className="h-4 w-4 text-hotel-gold" />
                                {t('editor.topic_and_categorization', 'Topic & Categorization')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-sm font-semibold mb-1.5 block">
                                    {t('editor.main_team_topic', 'Main Team (Topic)')}
                                </Label>
                                <GroupedDepartmentSelector
                                    departments={departments}
                                    properties={properties}
                                    value={formData.department_id || 'none'}
                                    onValueChange={v => {
                                        updateField('department_id', v === 'none' ? null : v)
                                        // Reset category when department changes
                                        updateField('category_id', null)
                                    }}
                                    placeholder={t('editor.select_department', 'Select main team...')}
                                    generalLabel={t('editor.general_department')}
                                    className="w-full"
                                />
                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                    {t('editor.department_hint_simple', 'Choose the team that owns this document topic.')}
                                </p>
                            </div>

                            {formData.department_id && (
                                <div className="pt-2 border-t border-dashed border-hotel-navy/10">
                                    <Label className="text-sm font-semibold mb-1.5 block">{t('editor.category_optional', 'Category (Optional)')}</Label>
                                    <Select value={formData.category_id || 'none'} onValueChange={v => updateField('category_id', v === 'none' ? null : v)}>
                                        <SelectTrigger className="w-full"><SelectValue placeholder={t('editor.category_optional', 'Category (Optional)')} /></SelectTrigger>
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

                    {/* 2. Access & Visibility */}
                    <Card className="border-hotel-navy/10 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-hotel-gold" />
                                {t('editor.who_can_view', 'Who Can View This')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div>
                                <Label className="text-sm font-semibold mb-1.5 block">{t('editor.viewer_group', 'Viewer Group')}</Label>
                                <Select value={formData.visibility} onValueChange={v => updateField('visibility', v as KnowledgeVisibility)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {VISIBILITY_OPTIONS.map(o => (
                                            <SelectItem key={o.value} value={o.value}>
                                                <div className="flex flex-col py-1">
                                                    <span className="font-semibold text-sm">{o.label}</span>
                                                    <span className="text-[10px] text-muted-foreground leading-tight">{o.description}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {formData.visibility === 'specific_departments' && (
                                    <div className="mt-3">
                                        <Label className="text-sm font-semibold mb-1.5 block">
                                            {t('editor.visibility.specific_departments_label', 'Select Teams')}
                                        </Label>
                                        <MultiDepartmentSelector
                                            departments={departments}
                                            properties={properties}
                                            value={formData.specific_department_ids}
                                            onValueChange={v => updateField('specific_department_ids', v)}
                                            placeholder={t('editor.visibility.select_depts', 'Select teams...')}
                                        />
                                    </div>
                                )}

                                {formData.visibility === 'department' && (
                                    <div className="mt-3">
                                        <Label className="text-sm font-semibold mb-1.5 block">
                                            {t('editor.select_team', 'Select Team')}
                                        </Label>
                                        <GroupedDepartmentSelector
                                            departments={departments}
                                            properties={properties}
                                            value={formData.department_id || 'none'}
                                            onValueChange={v => updateField('department_id', v === 'none' ? null : v)}
                                            placeholder={t('editor.select_team', 'Select team')}
                                            generalLabel={t('editor.general_department')}
                                            className="w-full"
                                        />
                                    </div>
                                )}

                                {/* Selected Visibility Context */}
                                <div className="mt-2 p-2 rounded bg-hotel-navy/5 border border-hotel-navy/10">
                                    <p className="text-[11px] text-hotel-navy/90 leading-relaxed">
                                        {visibilitySummary}
                                    </p>

                                    {/* Additional Settings for Group Department Visibility */}
                                    {formData.visibility === 'group_department' && (
                                        <div className="mt-3">
                                            <Label className="text-sm font-semibold mb-1.5 block">
                                                {t('editor.visibility.select_dept_group', 'Select Team')}
                                            </Label>
                                            <Select
                                                value={
                                                    // Find if current department_id matches one of the known names
                                                    (formData.department_id
                                                        ? departments?.find(d => d.id === formData.department_id)?.name
                                                        : undefined) || ''
                                                }
                                                onValueChange={(deptName) => {
                                                    // When name is selected, find a valid department ID from the list (prefer current property or Head Office)
                                                    const match = departments?.find(d => d.name === deptName && (
                                                        d.property_id === currentProperty?.id ||
                                                        properties?.find(p => p.id === d.property_id)?.name.toLowerCase().includes('head office')
                                                    )) || departments?.find(d => d.name === deptName)

                                                    if (match) {
                                                        updateField('department_id', match.id)
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={t('editor.visibility.choose_dept_group', 'Choose team...')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {uniqueDepartmentNames.map(name => (
                                                        <SelectItem key={name} value={name}>
                                                            {name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[10px] text-muted-foreground mt-1.5">
                                                {t('editor.visibility.group_dept_hint', 'This team will see this document in all hotels.')}
                                            </p>
                                        </div>
                                    )}

                                    {validationWarnings.departmentRequired && (
                                        <div className="mt-1 flex items-start gap-1.5">
                                            <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                                            <span className="text-[10px] font-bold text-orange-600">
                                                {t('editor.visibility.dept_warning')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Hotel selector - only needed for one-hotel scopes */}
                            {user && (formData.visibility === 'property' || formData.visibility === 'department') && (
                                <div>
                                    <Label className="text-sm font-semibold mb-1.5 block">{t('editor.which_hotel', 'Which Hotel?')}</Label>
                                    <Select
                                        value={formData.target_property_id || 'current'}
                                        onValueChange={v => updateField('target_property_id', v === 'current' ? null : v)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <Building2 className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                            <SelectValue placeholder={t('editor.which_hotel', 'Which Hotel?')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="current">
                                                <span className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-4 decoration-2">
                                                    {t('editor.current_hotel', 'Current Hotel')}
                                                </span>
                                                <span className="ml-1 opacity-50">
                                                    ({currentProperty?.name || 'Head Office'})
                                                </span>
                                            </SelectItem>
                                            {properties?.filter(p => p.id !== currentProperty?.id && p.id !== 'all').map(prop => (
                                                <SelectItem key={prop.id} value={prop.id}>
                                                    {prop.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="pt-2 border-t border-hotel-navy/5 flex items-center justify-between">
                                <Label className="text-sm font-medium cursor-pointer" htmlFor="ack-switch">
                                    {t('editor.require_read_confirmation', 'Require Read Confirmation')}
                                </Label>
                                <Switch
                                    id="ack-switch"
                                    checked={formData.requires_acknowledgment}
                                    onCheckedChange={v => updateField('requires_acknowledgment', v)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div >
    )
}
