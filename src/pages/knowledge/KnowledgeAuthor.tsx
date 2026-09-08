/**
 * KnowledgeAuthor (formerly KnowledgeEditor)
 *
 * Simplified article editor for Knowledge Base.
 * Uses 'documents' table.
 */

import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import {
    AIDocumentSummary,
    AIArticleStudioModal,
    ChecklistBuilder,
    ChecklistRenderer,
    FAQAccordion,
    FAQBuilder,
    ImageGalleryRenderer,
    RelatedArticlesEditor,
    StringListBuilder,
    VideoContentBuilder,
    VideoPlayer,
    VisualContentBuilder
} from '@/components/knowledge'
import { AuthorTopBar } from './components/author/AuthorTopBar'
import { ArticleReadinessDrawer, type ReadinessCheckItem } from './components/author/ArticleReadinessDrawer'
import { ArticleBasicsCard } from './components/author/ArticleBasicsCard'
import { AICoWriterRibbon } from './components/author/AICoWriterRibbon'
import { OperationalProtocolsTab } from './components/author/OperationalProtocolsTab'
import { AuthorInspector } from './components/author/AuthorInspector'
import { DocumentPicker } from '@/components/documents/DocumentPicker'
import { MediaPicker } from '@/components/media/MediaPicker'
import type { MediaAsset } from '@/lib/types/media'
import { GroupedDepartmentSelector } from '@/components/shared/GroupedDepartmentSelector'
import { MultiDepartmentSelector } from '@/components/shared/MultiDepartmentSelector'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import RichTextEditor from '@/components/ui/RichTextEditor'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useProperty } from '@/contexts/PropertyContext'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments } from '@/hooks/useDepartments'
import { useDuplicateDetection } from '@/hooks/useDuplicateDetection'
import { useFormPersistence } from '@/hooks/useFormPersistence'
import { useCategories, useRelatedArticles } from '@/hooks/useKnowledge'
import { useProperties } from '@/hooks/useProperties'
import { useTagSuggestions } from '@/hooks/useTagSuggestions'
import { useTrainingModules } from '@/hooks/useTraining'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { scanFile } from '@/hooks/useVirusScan'
import { extractTextFromAiResponse } from '@/lib/aiResponse'
import { aiService } from '@/lib/gemini'
import { renderMermaidDiagrams, transformMermaidCodeBlocks } from '@/lib/mermaid'
import { createBulkNotifications } from '@/services/notificationService'
import { sanitizeHtml } from '@/lib/sanitize'
import {
    type KnowledgeArticleMeta,
    type KnowledgeVisualAssetRef,
    generatedArticleToFormPatch,
    readKnowledgeMeta,
    toStringList,
    writeKnowledgeMeta,
} from '@/pages/knowledge/knowledgeArticleFidelity'
import { supabase } from '@/lib/supabase'
import * as KnowledgeService from '@/services/knowledgeService'
import type { Database, Json } from '@/types/database.generated'
import {
    type ChecklistItem,
    type FAQItem,
    type KnowledgeVisibility,
    CONTENT_TYPE_CONFIG
} from '@/types/knowledge'
import { useQueryClient } from '@tanstack/react-query'
import {
    AlertTriangle,
    ArrowLeft,
    BookOpen,
    Building,
    Building2,
    Check,
    CheckCircle2,
    CheckSquare,
    ChevronDown,
    Clock,
    Crown,
    ExternalLink,
    Eye,
    FileText,
    FolderOpen,
    Gauge,
    Globe,
    HelpCircle,
    Image as ImageIcon,
    Languages,
    Layers,
    LifeBuoy,
    Link as LinkIcon,
    List,
    Loader2,
    Palette,
    RefreshCw,
    Save,
    Send,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Star,
    Tag,
    Trash2,
    Upload,
    Video as VideoIcon,
    Wand2,
    X
} from 'lucide-react'
import { marked } from 'marked'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

interface ArticleFormData {
    title: string
    description: string
    summary: string              // TL;DR summary for quick reading
    content: string
    // Arabic / bilingual fields (persisted to dedicated documents columns)
    title_ar: string
    description_ar: string
    summary_ar: string
    content_ar: string
    // SOP metadata
    sop_code: string
    estimated_read_time: number | null
    file_url: string
    storage_path: string
    content_type: string
    visibility: KnowledgeVisibility
    scope_type: 'organization' | 'brand' | 'hotel' | 'department' | 'global'
    is_master_template: boolean
    master_source_id?: string | null
    requires_acknowledgment: boolean
    featured: boolean
    department_id: string | null
    category_id: string | null
    target_property_id: string | null
    specific_department_ids: string[] // For specific departments visibility
    linked_training_id: string | null
    // Content Type Specific
    checklist_items: ChecklistItem[]
    faq_items: FAQItem[]
    video_url: string
    images: Array<{ id: string; url: string; caption: string; order: number }>
    // AI Auto-tagging fields
    ai_tags: string[]
    ai_category: string
    ai_processed_at: string
    // Structured operational sections from the AI KB pipeline
    critical_control_points: string[]
    service_benchmarks: string[]
    contingency_protocols: string[]
    // Visual asset reference (also inlined into content HTML)
    visual_asset: KnowledgeVisualAssetRef | null
    // AI compliance scorecard (round-tripped, read-only-ish)
    ai_compliance_score: number | null
    ai_compliance_notes: string[]
    ai_compliance_checked_at: string
    // AI generation provenance
    ai_models_used: string[]
    ai_model_used: string
    ai_provider_used: string
    ai_cost_tier: string
    ai_total_duration_ms: number | null
    // Index signature for useFormPersistence compatibility
    [key: string]: unknown
}

const createEmptyArticleFormData = (): ArticleFormData => ({
    title: '',
    description: '',
    summary: '',
    content: '',
    title_ar: '',
    description_ar: '',
    summary_ar: '',
    content_ar: '',
    sop_code: '',
    estimated_read_time: null,
    file_url: '',
    storage_path: '',
    content_type: 'document',
    visibility: 'all_properties',
    scope_type: 'organization',
    is_master_template: false,
    master_source_id: null,
    requires_acknowledgment: false,
    featured: false,
    department_id: null,
    category_id: null,
    target_property_id: null,
    specific_department_ids: [],
    linked_training_id: null,
    checklist_items: [],
    faq_items: [],
    video_url: '',
    images: [],
    ai_tags: [],
    ai_category: '',
    ai_processed_at: '',
    critical_control_points: [],
    service_benchmarks: [],
    contingency_protocols: [],
    visual_asset: null,
    ai_compliance_score: null,
    ai_compliance_notes: [],
    ai_compliance_checked_at: '',
    ai_models_used: [],
    ai_model_used: '',
    ai_provider_used: '',
    ai_cost_tier: '',
    ai_total_duration_ms: null,
})

const hasDraftableArticleContent = (formData: ArticleFormData) => {
    // Use recursive sanitization to prevent bypass attempts with nested tags
    let previous: string;
    let richTextContent = formData.content;
    do {
      previous = richTextContent;
      richTextContent = previous.replace(/<[^>]*>/g, ' ');
    } while (richTextContent !== previous);
    richTextContent = richTextContent.replace(/\s+/g, ' ').trim()

    return Boolean(
        formData.title.trim() ||
        formData.description.trim() ||
        formData.summary.trim() ||
        richTextContent ||
        formData.title_ar.trim() ||
        formData.description_ar.trim() ||
        formData.summary_ar.trim() ||
        formData.content_ar.trim() ||
        formData.sop_code.trim() ||
        formData.critical_control_points.length > 0 ||
        formData.service_benchmarks.length > 0 ||
        formData.contingency_protocols.length > 0 ||
        formData.visual_asset ||
        formData.file_url.trim() ||
        formData.storage_path.trim() ||
        formData.video_url.trim() ||
        formData.department_id ||
        formData.category_id ||
        formData.target_property_id ||
        formData.linked_training_id ||
        formData.requires_acknowledgment ||
        formData.featured ||
        formData.content_type !== 'document' ||
        formData.visibility !== 'all_properties' ||
        formData.checklist_items.length > 0 ||
        formData.faq_items.length > 0 ||
        formData.images.length > 0 ||
        formData.ai_tags.length > 0 ||
        formData.ai_category.trim() ||
        formData.ai_processed_at.trim() ||
        formData.specific_department_ids.length > 0
    )
}

const isUuid = (value?: string | null): value is string => {
    if (!value) return false
    // Accept any canonical UUID-like identifier stored in DB (including legacy non-RFC variant IDs).
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

// AI Document Tagging Helpers
function generateAITags(fileName: string, title: string): string[] {
    const text = `${fileName} ${title}`.toLowerCase()
    const tags: string[] = []
    
    // Document type tags
    if (fileName.endsWith('.pdf')) tags.push('pdf')
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) tags.push('word')
    if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) tags.push('excel')
    
    // Content-based tags
    const tagKeywords: Record<string, string[]> = {
        'guest-services': ['guest', 'customer', 'stay', 'check-in', 'check-out'],
        'reviews': ['review', 'feedback', 'rating', 'online'],
        'sop': ['sop', 'procedure', 'standard', 'operating'],
        'hr': ['hr', 'employee', 'staff', 'training', 'policy'],
        'finance': ['finance', 'budget', 'invoice', 'payment', 'billing'],
        'operations': ['operations', 'housekeeping', 'maintenance', 'front-desk'],
        'safety': ['safety', 'security', 'emergency', 'fire', 'compliance'],
        'marketing': ['marketing', 'sales', 'promotion', 'booking'],
        'f&b': ['food', 'beverage', 'restaurant', 'menu', 'kitchen'],
        'events': ['event', 'conference', 'banquet', 'meeting', 'wedding']
    }
    
    for (const [tag, keywords] of Object.entries(tagKeywords)) {
        if (keywords.some(kw => text.includes(kw))) {
            tags.push(tag)
        }
    }
    
    // Add document type if no specific category found
    if (tags.length === 1) { // Only has file type tag
        tags.push('document')
    }
    
    return [...new Set(tags)].slice(0, 8) // Max 8 tags, unique
}

function categorizeDocument(tags: string[]): string {
    const categoryMap: Record<string, string> = {
        'guest-services': 'Guest Services',
        'reviews': 'Operations',
        'sop': 'Operations',
        'hr': 'HR & Training',
        'finance': 'Finance',
        'operations': 'Operations',
        'safety': 'Safety & Compliance',
        'marketing': 'Sales & Marketing',
        'f&b': 'Food & Beverage',
        'events': 'Events'
    }
    
    for (const tag of tags) {
        if (categoryMap[tag]) return categoryMap[tag]
    }
    
    return 'General'
}

export default function KnowledgeAuthor() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation(['knowledge', 'common'])
    const { user, profile, primaryRole } = useAuth()
    const { currentOrganization, currentBrand, currentHotel, isPlatformAdmin } = useTenant()
    const { currentProperty } = useProperty()
    const queryClient = useQueryClient()
    const isEditing = Boolean(id)

    // Mount and hydration tracking
    const [hasMounted, setHasMounted] = useState(false)
    const [showRestorePrompt, setShowRestorePrompt] = useState(false)
    const [allowUnsafeNavigation, setAllowUnsafeNavigation] = useState(false)
    const [isAiStudioOpen, setIsAiStudioOpen] = useState(false)
    const allowUnsafeNavigationRef = useRef(false)
    const restoredDraftRef = useRef(false)
    // Raw `content_data` jsonb from the loaded document, so unrelated keys
    // (e.g. training block payloads) survive a save round-trip.
    const loadedContentDataRef = useRef<Json | null>(null)

    const [formData, setFormData] = useState<ArticleFormData>(() => createEmptyArticleFormData())
    const [releaseNotes, setReleaseNotes] = useState('')
    const [localAddendumEn, setLocalAddendumEn] = useState('')
    const [localAddendumAr, setLocalAddendumAr] = useState('')
    const [masterDeploymentCount, setMasterDeploymentCount] = useState<number | null>(null)

    // Handle isMaster query param for direct authoring from Platform Library
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search)
        if (searchParams.get('isMaster') === 'true' && !id && isPlatformAdmin) {
            setFormData(prev => ({
                ...prev,
                is_master_template: true,
                scope_type: 'global',
                visibility: 'all_properties'
            }))
        }
    }, [location.search, id, isPlatformAdmin])

    // Query deployment count for master SOP telemetry
    useEffect(() => {
        if (id && formData.is_master_template) {
            supabase
                .from('master_content_deployments')
                .select('id', { count: 'exact', head: true })
                .eq('master_content_id', id)
                .then(({ count }) => {
                    setMasterDeploymentCount(count || 0)
                })
        }
    }, [id, formData.is_master_template])

    // Handle prefill from AI Article Studio or other pages
    useEffect(() => {
        const prefill = (location.state as any)?.prefillArticle
        if (prefill && !id) {
            setFormData((prev) => ({
                ...prev,
                title: prefill.title || prev.title,
                description: prefill.description || prev.description,
                summary: prefill.summary || prev.summary,
                content: prefill.content || prev.content,
                title_ar: prefill.title_ar || prev.title_ar,
                description_ar: prefill.description_ar || prev.description_ar,
                summary_ar: prefill.summary_ar || prev.summary_ar,
                content_ar: prefill.content_ar || prev.content_ar,
                sop_code: prefill.sop_code || prev.sop_code,
                estimated_read_time: prefill.estimated_read_time ?? prev.estimated_read_time,
                content_type: prefill.content_type || prev.content_type,
                checklist_items: prefill.checklist_items || prev.checklist_items,
                faq_items: prefill.faq_items || prev.faq_items,
                ai_tags: prefill.ai_tags || prev.ai_tags,
                critical_control_points: prefill.critical_control_points || prev.critical_control_points,
                service_benchmarks: prefill.service_benchmarks || prev.service_benchmarks,
                contingency_protocols: prefill.contingency_protocols || prev.contingency_protocols,
                visual_asset: prefill.visual_asset ?? prev.visual_asset,
            }))
        }
    }, [location.state, id])

    const formPersistence = useFormPersistence<ArticleFormData>({
        key: `knowledge_editor_${id || 'new'}`,
        enabled: !isEditing,
        debounceMs: 500,
        version: 3,
        validate: (draft) => typeof draft === 'object' && draft !== null,
        transformAfterLoad: (draft) => ({
            ...createEmptyArticleFormData(),
            ...draft,
            content_type: draft.content_type || 'document',
            visibility: (draft.visibility || 'all_properties') as KnowledgeVisibility,
            department_id: draft.department_id || null,
            category_id: draft.category_id || null,
            target_property_id: draft.target_property_id || null,
            linked_training_id: draft.linked_training_id || null,
            checklist_items: Array.isArray(draft.checklist_items) ? draft.checklist_items : [],
            faq_items: Array.isArray(draft.faq_items) ? draft.faq_items : [],
            images: Array.isArray(draft.images) ? draft.images : [],
            ai_tags: Array.isArray(draft.ai_tags) ? draft.ai_tags : [],
            specific_department_ids: Array.isArray(draft.specific_department_ids) ? draft.specific_department_ids : [],
            critical_control_points: Array.isArray(draft.critical_control_points) ? draft.critical_control_points : [],
            service_benchmarks: Array.isArray(draft.service_benchmarks) ? draft.service_benchmarks : [],
            contingency_protocols: Array.isArray(draft.contingency_protocols) ? draft.contingency_protocols : [],
            ai_compliance_notes: Array.isArray(draft.ai_compliance_notes) ? draft.ai_compliance_notes : [],
            ai_models_used: Array.isArray(draft.ai_models_used) ? draft.ai_models_used : [],
            visual_asset: (draft.visual_asset && typeof draft.visual_asset === 'object') ? draft.visual_asset : null,
        }),
    })
    const { loadDraft, saveDraft, clearDraft, markSaved, hasDraft, hasUnsavedChanges } = formPersistence

    const shouldWarnOnExit =
        !allowUnsafeNavigationRef.current &&
        !allowUnsafeNavigation &&
        !isEditing &&
        hasMounted &&
        (hasDraft || hasUnsavedChanges)
    const { Dialog: UnsavedChangesDialog } = useUnsavedChanges(shouldWarnOnExit)

    // ============================================
    // HYDRATION: Load draft from persisted storage on mount
    // ============================================
    useEffect(() => {
        if (isEditing) {
            setHasMounted(true)
            return
        }

        const draft = loadDraft()
        if (draft && hasDraftableArticleContent(draft as ArticleFormData)) {
            setFormData(draft as ArticleFormData)

            if (!restoredDraftRef.current) {
                restoredDraftRef.current = true
                setShowRestorePrompt(true)
                setTimeout(() => setShowRestorePrompt(false), 8000)
            }
        }
        setHasMounted(true)
    }, [isEditing, loadDraft])

    // ============================================
    // PERSISTENCE: Save draft on changes
    // ============================================
    useEffect(() => {
        if (!hasMounted || isEditing) return
        if (!hasDraftableArticleContent(formData)) {
            if (hasDraft) {
                clearDraft()
            } else {
                markSaved()
            }
            return
        }

        saveDraft(formData)
    }, [clearDraft, formData, hasDraft, hasMounted, isEditing, markSaved, saveDraft])

    useEffect(() => {
        if (!shouldWarnOnExit) return

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault()
            event.returnValue = ''
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [shouldWarnOnExit])

    // Fetch existing data if editing

    const { data: relatedArticles = [], refetch: refetchRelated } = useRelatedArticles(id || '')
    const { departments } = useDepartments(currentProperty?.id)
    const { data: categories } = useCategories(formData.department_id || undefined)
    const { data: properties } = useProperties()
    const { data: trainingModules } = useTrainingModules()

    // Duplicate detection and tag suggestions
    const { checkForDuplicates, isReady, result: duplicateResult } = useDuplicateDetection()
    const { suggestions: tagSuggestions, isGenerating: isGeneratingTags, generateSuggestions, clearSuggestions } = useTagSuggestions()
    const [duplicateCheckResult, setDuplicateCheckResult] = useState<{ duplicates: Array<{ id: string; title: string; similarity: number; content_type: string }>; hasDuplicates: boolean } | null>(null)
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
    const [dismissedDuplicateTitle, setDismissedDuplicateTitle] = useState<string | null>(null)

    // Check for duplicates when title changes (debounced)
    useEffect(() => {
        if (!isReady || formData.title.length < 5 || isEditing) {
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
        setDuplicateCheckResult(duplicateResult)

        if (duplicateResult?.hasDuplicates) {
            if (formData.title !== dismissedDuplicateTitle) {
                setShowDuplicateWarning(true)
            }
        } else {
            setShowDuplicateWarning(false)
        }
    }, [duplicateResult, formData.title, dismissedDuplicateTitle])

    // Extract unique department names for group selection
    const uniqueDepartmentNames = useMemo(() => {
        if (!departments) return []
        return Array.from(new Set(departments.map(d => d.name))).sort()
    }, [departments])

    // Helper function to notify reviewers when a document is submitted for review
    const notifyReviewersOfSubmission = async (documentId: string, documentTitle: string) => {
        try {
            // Get reviewers with reviewer roles from user_roles table
            const reviewerRoles: Database['public']['Enums']['app_role'][] = ['property_manager', 'regional_admin', 'regional_hr']

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
                // No reviewers found to notify
                return
            }

            // Filter active users and exclude the author, get unique user IDs
            const uniqueReviewerIds = new Set<string>()
            const reviewers: { id: string; full_name: string }[] = []
            interface ReviewerRoleRecord {
                user_id: string
                profiles?: {
                    id: string
                    full_name: string
                    is_active: boolean
                } | null
            }

            for (const rawItem of (reviewerRolesData as unknown as ReviewerRoleRecord[])) {
                const reviewerProfile = rawItem.profiles
                if (reviewerProfile?.is_active && reviewerProfile.id !== user?.id && !uniqueReviewerIds.has(reviewerProfile.id)) {
                    uniqueReviewerIds.add(reviewerProfile.id)
                    reviewers.push({ id: reviewerProfile.id, full_name: reviewerProfile.full_name })
                }
            }

            if (reviewers.length === 0) {
                // No active reviewers found to notify
                return
            }

            // Create notifications for all reviewers
            const notifications = reviewers.map(reviewer => ({
                user_id: reviewer.id,
                title: '📋 New Document for Review',
                message: `"${documentTitle}" has been submitted for review by ${profile?.full_name || 'a team member'}.`,
            }))

            if (notifications.length > 0) {
                await createBulkNotifications({
                    userIds: reviewers.map(r => r.id),
                    type: 'document_review_pending',
                    title: '📋 New Document for Review',
                    message: `"${documentTitle}" has been submitted for review by ${profile?.full_name || 'a team member'}.`,
                    metadata: {
                        link: `/knowledge/review`,
                        document_id: documentId,
                        submitted_by: user?.id,
                        submitted_by_name: profile?.full_name
                    }
                })
            } else {
                // Notified reviewers about document submission
            }
        } catch (error) {
            console.error('Failed to notify reviewers:', error)
        }
    }

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

    const [mainWorkspaceTab, setMainWorkspaceTab] = useState<'content' | 'protocols' | 'preview'>('content')
    const [inspectorTab, setInspectorTab] = useState<'publishing' | 'media' | 'governance'>('publishing')
    const [isReadinessDrawerOpen, setIsReadinessDrawerOpen] = useState(false)
    // Which language the core content fields (title/description/summary/body) edit.
    const [editLang, setEditLang] = useState<'en' | 'ar'>('en')
    const [showComplianceNotes, setShowComplianceNotes] = useState(false)
    const previewRef = useRef<HTMLDivElement>(null)
    const [isSaving, setIsSaving] = useState(false)
    const isSavingInFlightRef = useRef(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [aiLanguage, setAiLanguage] = useState('English')
    const [isForbidden, setIsForbidden] = useState(false)
    const [showDocumentPicker, setShowDocumentPicker] = useState(false)
    const [showMediaPicker, setShowMediaPicker] = useState(false)
    // Bridges the callback-based MediaPicker to the editor's promise-based onPickMedia.
    const mediaPickResolveRef = useRef<((url: string | null) => void) | null>(null)
    const mediaPickKindRef = useRef<'image' | 'video'>('image')
    const [beautifyOptions, setBeautifyOptions] = useState({
        includeTables: true,
        includeMermaid: false,
        includeCallouts: true,
        includeTOC: true
    })

    const toPlainText = useCallback((value: string) => {
        const parser = new DOMParser()
        const doc = parser.parseFromString(value, 'text/html')
        return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
    }, [])

    const toHtmlContent = useCallback((value: string) => {
        const trimmed = value.trim()
        if (!trimmed) return ''
        return trimmed.startsWith('<')
            ? trimmed
            : (marked.parse(trimmed, { async: false }) as string)
    }, [])

    const ensureBeautifyFeatures = useCallback((html: string, opts: typeof beautifyOptions) => {
        if (!html) return html

        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const body = doc.body

        const slugify = (value: string) =>
            value
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')

        const ensureHeadingIds = () => {
            const used = new Set<string>()
            const headings = Array.from(body.querySelectorAll('h1, h2, h3, h4'))
            headings.forEach((h) => {
                const base = slugify(h.textContent || 'section') || 'section'
                let id = base
                let i = 2
                while (used.has(id)) {
                    id = `${base}-${i}`
                    i += 1
                }
                h.id = h.id || id
                used.add(h.id)
            })
            return headings
        }

        const headings = ensureHeadingIds()
        const nonTitleHeadings = headings.filter((h) => h.tagName !== 'H1')
        const generatedTOCs = Array.from(body.querySelectorAll('.ai-generated-toc'))
        const generatedSummaryTables = Array.from(body.querySelectorAll('table.ai-generated-summary-table'))
        const generatedCallouts = Array.from(body.querySelectorAll('.ai-generated-callout'))
        const generatedMermaidBlocks = Array.from(body.querySelectorAll('pre.ai-generated-mermaid'))
        const hasAnyTable = Array.from(body.querySelectorAll('table')).some(
            (table) => !table.classList.contains('summary-table') && !table.classList.contains('ai-generated-summary-table')
        )
        const hasTOC = !!body.querySelector('.table-of-contents, .ai-generated-toc, .ai-content .ai-section-title')
        const hasCallout = !!body.querySelector(
            '.ai-highlight-box, .ai-warning-box, .ai-info-box, .ai-tip-box, [class^="alert-"], [class*=" alert-"]'
        )
        const hasMermaid = !!body.querySelector('pre.mermaid, .mermaid')

        if (!opts.includeTOC || hasTOC) {
            generatedTOCs.forEach((node) => node.remove())
        }
        if (!opts.includeTables) {
            generatedSummaryTables.forEach((node) => node.remove())
        }
        if (!opts.includeCallouts) {
            generatedCallouts.forEach((node) => node.remove())
        }
        if (!opts.includeMermaid) {
            generatedMermaidBlocks.forEach((node) => node.remove())
        }

        const existingTOCs = Array.from(body.querySelectorAll('.table-of-contents'))
        if (existingTOCs.length > 1) {
            existingTOCs.slice(1).forEach((node) => node.remove())
        }
        const existingSummaryTables = Array.from(body.querySelectorAll('table.summary-table, table.ai-generated-summary-table'))
        if (existingSummaryTables.length > 1) {
            existingSummaryTables.slice(1).forEach((node) => node.remove())
        }

        const insertAtTop = (node: HTMLElement) => {
            if (body.firstChild) {
                body.insertBefore(node, body.firstChild)
            } else {
                body.appendChild(node)
            }
        }
        const insertAfter = (ref: Element | null, node: HTMLElement) => {
            if (!ref || !ref.parentNode) {
                insertAtTop(node)
                return
            }
            const parent = ref.parentNode
            if (ref.nextSibling) parent.insertBefore(node, ref.nextSibling)
            else parent.appendChild(node)
        }

        const titleNode = body.querySelector('h1')
        if (opts.includeTOC && !hasTOC && nonTitleHeadings.length > 0) {
            const toc = doc.createElement('section')
            toc.className = 'ai-section table-of-contents ai-generated-toc'
            const title = doc.createElement('h2')
            title.className = 'ai-section-title'
            title.textContent = t('editor.table_of_contents', 'Table of Contents')
            const list = doc.createElement('ol')
            list.className = 'ai-ordered-list'
            nonTitleHeadings.forEach((h) => {
                const li = doc.createElement('li')
                const a = doc.createElement('a')
                a.setAttribute('href', `#${h.id}`)
                a.textContent = h.textContent || 'Section'
                li.appendChild(a)
                list.appendChild(li)
            })
            toc.appendChild(title)
            toc.appendChild(list)

            const insertionPoint = body.querySelector('.ai-content') || body
            if (insertionPoint === body) {
                insertAfter(titleNode, toc)
            } else {
                if (insertionPoint.firstChild) insertionPoint.insertBefore(toc, insertionPoint.firstChild)
                else insertionPoint.appendChild(toc)
            }
        }

        if (opts.includeTables && !existingSummaryTables.length && !hasAnyTable) {
            const table = doc.createElement('table')
            table.className = 'ai-table summary-table ai-generated-summary-table'
            const thead = doc.createElement('thead')
            const headRow = doc.createElement('tr')
            const th1 = doc.createElement('th')
            th1.textContent = t('editor.section', 'Section')
            const th2 = doc.createElement('th')
            th2.textContent = t('editor.summary', 'Summary')
            headRow.appendChild(th1)
            headRow.appendChild(th2)
            thead.appendChild(headRow)
            table.appendChild(thead)

            const tbody = doc.createElement('tbody')
            const getSummary = (heading: Element) => {
                let sibling = heading.nextElementSibling
                while (sibling) {
                    if (/^H[1-4]$/.test(sibling.tagName)) break
                    if (sibling.tagName === 'P' && sibling.textContent?.trim()) {
                        return sibling.textContent.trim().slice(0, 180)
                    }
                    sibling = sibling.nextElementSibling
                }
                return ''
            }

            if (nonTitleHeadings.length > 0) {
                nonTitleHeadings.forEach((h) => {
                    const row = doc.createElement('tr')
                    const td1 = doc.createElement('td')
                    td1.textContent = h.textContent || ''
                    const td2 = doc.createElement('td')
                    td2.textContent = getSummary(h)
                    row.appendChild(td1)
                    row.appendChild(td2)
                    tbody.appendChild(row)
                })
            } else {
                const row = doc.createElement('tr')
                const td1 = doc.createElement('td')
                td1.textContent = t('editor.overview', 'Overview')
                const td2 = doc.createElement('td')
                const firstParagraph = body.querySelector('p')?.textContent?.trim() || ''
                td2.textContent = firstParagraph.slice(0, 180)
                row.appendChild(td1)
                row.appendChild(td2)
                tbody.appendChild(row)
            }

            table.appendChild(tbody)
            const tocNode = body.querySelector('.table-of-contents')
            insertAfter(tocNode || titleNode, table)
        }

        if (opts.includeCallouts && !hasCallout) {
            let replaced = false
            const calloutMap: Record<string, string> = {
                IMPORTANT: 'ai-warning-box',
                WARNING: 'ai-warning-box',
                NOTE: 'ai-info-box',
                TIP: 'ai-tip-box',
                REMEMBER: 'ai-highlight-box'
            }

            Array.from(body.querySelectorAll('p')).forEach((p) => {
                const text = p.textContent?.trim() || ''
                const match = text.match(/^(IMPORTANT|WARNING|NOTE|TIP|REMEMBER)\s*[:-]\s*(.+)$/i)
                if (!match) return
                const label = match[1].toUpperCase()
                const content = match[2]
                const div = doc.createElement('div')
                div.className = `${calloutMap[label] || 'ai-info-box'} ai-generated-callout`
                const strong = doc.createElement('strong')
                strong.textContent = `${label}: `
                div.appendChild(strong)
                div.appendChild(doc.createTextNode(content))
                p.replaceWith(div)
                replaced = true
            })

            if (!replaced) {
                const fallback = doc.createElement('div')
                fallback.className = 'ai-info-box ai-generated-callout'
                const strong = doc.createElement('strong')
                strong.textContent = `${t('editor.note', 'NOTE')}: `
                fallback.appendChild(strong)
                fallback.appendChild(
                    doc.createTextNode(
                        t('editor.callout_fallback', 'Review the table of contents for quick navigation and key steps.')
                    )
                )
                const tocNode = body.querySelector('.table-of-contents')
                const summaryTable = body.querySelector('table.summary-table, table.ai-generated-summary-table')
                insertAfter(summaryTable || tocNode || titleNode, fallback)
            }
        }

        if (opts.includeMermaid && !hasMermaid && nonTitleHeadings.length > 1) {
            const labels = [
                (titleNode?.textContent || t('editor.overview', 'Overview')).trim(),
                ...nonTitleHeadings.slice(0, 4).map((h) => (h.textContent || t('editor.section', 'Section')).trim()),
            ].filter(Boolean)

            if (labels.length > 1) {
                const normalizeMermaidLabel = (value: string) => value.replace(/[\\"]/g, '\\$&')
                const nodeId = (index: number) => `N${index + 1}`
                const lines = ['flowchart TD']

                labels.forEach((label, index) => {
                    lines.push(`${nodeId(index)}["${normalizeMermaidLabel(label)}"]`)
                    if (index > 0) {
                        lines.push(`${nodeId(index - 1)} --> ${nodeId(index)}`)
                    }
                })

                const mermaidBlock = doc.createElement('pre')
                mermaidBlock.className = 'mermaid ai-generated-mermaid'
                mermaidBlock.textContent = lines.join('\n')

                const summaryTable = body.querySelector('table.summary-table, table.ai-generated-summary-table')
                const tocNode = body.querySelector('.table-of-contents')
                insertAfter(summaryTable || tocNode || titleNode, mermaidBlock)
            }
        }

        return body.innerHTML
    }, [t])

    const finalizeAiHtmlForEditor = useCallback((
        rawResult: string,
        fallbackSource?: string,
        minRetentionRatio = 0
    ) => {
        const extracted = extractTextFromAiResponse(rawResult).trim()
        if (!extracted) return ''

        const resultHtml = toHtmlContent(extracted)
        const fallbackHtml = fallbackSource ? toHtmlContent(fallbackSource) : ''
        const resultPlain = toPlainText(resultHtml)
        const fallbackPlain = toPlainText(fallbackHtml)
        const shouldUseFallback =
            minRetentionRatio > 0 &&
            !!fallbackPlain &&
            resultPlain.length < fallbackPlain.length * minRetentionRatio

        let html = shouldUseFallback ? fallbackHtml : resultHtml

        if (beautifyOptions.includeMermaid) {
            html = transformMermaidCodeBlocks(html)
        } else {
            html = html
                .replace(/<pre[^>]*class=["'][^"']*\bmermaid\b[^"']*["'][^>]*>[\s\S]*?<\/pre>/gi, '')
                .replace(/```mermaid[\s\S]*?```/gi, '')
        }

        const enhanced = ensureBeautifyFeatures(html, beautifyOptions)
        return sanitizeHtml(enhanced)
    }, [beautifyOptions, ensureBeautifyFeatures, toHtmlContent, toPlainText])

    const previewHtml = useMemo(() => {
        const raw = (editLang === 'en' ? formData.content : formData.content_ar) || ''
        if (!raw.trim()) return `<p class="text-gray-400">${t('editor.empty_preview')}</p>`
        const isHtml = raw.trim().startsWith('<')
        const html = isHtml ? raw : (marked.parse(raw, { async: false }) as string)
        return transformMermaidCodeBlocks(html)
    }, [editLang, formData.content, formData.content_ar, t])

    useEffect(() => {
        if (mainWorkspaceTab !== 'preview') return
        void renderMermaidDiagrams(previewRef.current)
    }, [mainWorkspaceTab, previewHtml])

    // Permission check
    useEffect(() => {
        if (primaryRole === 'staff' || primaryRole === 'learner') {
            setIsForbidden(true)
            toast.error('You do not have permission to create or edit articles.')
            navigate('/knowledge')
        }
    }, [primaryRole, navigate])

    // Load Data Effect
    useEffect(() => {
        if (id && id !== 'new') {
            supabase
                .from('documents')
                .select('*, document_department_access(department_id)')
                .eq('id', id)
                .single()
                .then(({ data, error }) => {
                    if (data && !error) {
                        const parsedChecklist = Array.isArray(data.checklist_items)
                            ? (data.checklist_items as unknown as ChecklistItem[])
                            : []
                        const parsedFaq = Array.isArray(data.faq_items)
                            ? (data.faq_items as unknown as FAQItem[])
                            : []
                        const parsedImages = Array.isArray(data.images)
                            ? (data.images as unknown as Array<{ id: string; url: string; caption: string; order: number }>)
                            : []
                        const accessIds = Array.isArray(data.document_department_access)
                            ? data.document_department_access
                                .map((item: { department_id: string | null }) => item.department_id)
                                .filter((deptId): deptId is string => typeof deptId === 'string')
                            : []

                        loadedContentDataRef.current = (data.content_data ?? null) as Json | null
                        const meta = readKnowledgeMeta(data.content_data as Json | null)

                        setFormData({
                            title: data.title || '',
                            description: data.description || '',
                            summary: data.summary || '',
                            content: data.content || '',
                            title_ar: data.title_ar || '',
                            description_ar: data.description_ar || '',
                            summary_ar: data.summary_ar || '',
                            content_ar: data.content_ar || '',
                            sop_code: data.sop_code || '',
                            estimated_read_time: typeof data.estimated_read_time === 'number' ? data.estimated_read_time : null,
                            file_url: data.file_url || '',
                            storage_path: '',
                            content_type: data.content_type || 'document',
                            visibility: (data.visibility || 'all_properties') as KnowledgeVisibility,
                            scope_type: ((data as any).scope_type || 'organization') as any,
                            is_master_template: Boolean((data as any).is_master_template),
                            master_source_id: (data as any).master_source_id || null,
                            requires_acknowledgment: data.requires_acknowledgment || false,
                            featured: false,
                            department_id: data.department_id || null,
                            category_id: data.category_id || null,
                            target_property_id: data.property_id || null,
                            specific_department_ids: accessIds,
                            linked_training_id: data.linked_training_id || null,
                            // Content Type Specific
                            checklist_items: parsedChecklist,
                            faq_items: parsedFaq,
                            video_url: data.video_url || '',
                            images: parsedImages,
                            // AI Auto-tagging fields
                            ai_tags: data.ai_tags || [],
                            ai_category: data.ai_category || '',
                            ai_processed_at: data.ai_processed_at || '',
                            // Structured operational sections + compliance (from content_data)
                            critical_control_points: meta.critical_control_points,
                            service_benchmarks: meta.service_benchmarks,
                            contingency_protocols: meta.contingency_protocols,
                            visual_asset: meta.visual_asset,
                            ai_compliance_score: meta.ai_compliance_score,
                            ai_compliance_notes: meta.ai_compliance_notes,
                            ai_compliance_checked_at: meta.ai_compliance_checked_at || '',
                            ai_models_used: meta.ai_models_used,
                            ai_model_used: meta.ai_model_used || '',
                            ai_provider_used: meta.ai_provider_used || '',
                            ai_cost_tier: meta.ai_cost_tier || '',
                            ai_total_duration_ms: meta.ai_total_duration_ms,
                        })

                        // Load Master SOP release notes and local property addendum
                        const rawContentData = ((data as any).content_data || {}) as Record<string, any>
                        if (rawContentData.release_notes && typeof rawContentData.release_notes === 'string') {
                            setReleaseNotes(rawContentData.release_notes)
                        }
                        if (rawContentData.local_addendum && typeof rawContentData.local_addendum === 'object') {
                            setLocalAddendumEn(rawContentData.local_addendum.en || '')
                            setLocalAddendumAr(rawContentData.local_addendum.ar || '')
                        }
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
                if (value === null && (updated.visibility === 'department' || updated.visibility === 'group_department')) {
                    updated.visibility = 'all_properties' as KnowledgeVisibility
                }
            }

            // Smart validation: If visibility requires department but none selected, show warning
            if (field === 'visibility') {
                // If switching to department-based visibility without a department, auto-select cannot proceed
                // Just update the value, validation will show warning
            }

            return updated
        })
    }, [])

    // The editor asks for a media URL and inserts it itself (proper TipTap node,
    // not string concat). Returns null if the picker is dismissed.
    const pickMediaFromLibrary = useCallback((kind: 'image' | 'video'): Promise<string | null> => {
        return new Promise((resolve) => {
            mediaPickKindRef.current = kind
            mediaPickResolveRef.current = resolve
            setShowMediaPicker(true)
        })
    }, [])

    const handleOpenVideoPicker = useCallback(() => {
        mediaPickKindRef.current = 'video'
        mediaPickResolveRef.current = null
        setShowMediaPicker(true)
    }, [])

    const handleMediaSelect = useCallback((assets: MediaAsset[]) => {
        if (assets.length === 0) return
        const asset = assets[0]

        // Editor-initiated pick: hand the URL back and let the editor insert it.
        if (mediaPickResolveRef.current) {
            mediaPickResolveRef.current(asset.public_url)
            mediaPickResolveRef.current = null
            setShowMediaPicker(false)
            if (asset.media_type === 'video') {
                if (!formData.video_url) {
                    updateField('video_url', asset.public_url)
                }
                toast.success(t('editor.video_linked', 'Video linked from media library: {{title}}', {
                    title: asset.title || asset.filename || 'Video'
                }))
            } else {
                toast.success(t('editor.media_inserted', 'Image inserted from media library'))
            }
            return
        }

        if (asset.media_type === 'image') {
            const imgHtml = `<p><img src="${asset.public_url}" alt="${asset.title || asset.filename}" class="rounded-xl shadow-md my-4 max-w-full" /></p>`
            updateField('content', (formData.content || '') + '\n' + imgHtml)
            toast.success(t('editor.media_inserted', 'Image inserted from media library'))
        } else if (asset.media_type === 'video') {
            updateField('video_url', asset.public_url)
            if (formData.content_type !== 'video') {
                updateField('content_type', 'video')
            }
            toast.success(t('editor.video_linked', 'Video linked from media library: {{title}}', {
                title: asset.title || asset.filename || 'Video'
            }))
        } else {
            updateField('file_url', asset.public_url)
            toast.success(t('editor.media_attached', 'Media asset attached to document'))
        }
        setShowMediaPicker(false)
    }, [formData.content, formData.content_type, formData.video_url, t, updateField])

    // Computed validation warnings
    const validationWarnings = {
        departmentRequired: (formData.visibility === 'department' || formData.visibility === 'group_department') && !formData.department_id,
        propertyIrrelevant: (formData.visibility === 'all_properties' || formData.visibility === 'group_department') && formData.target_property_id,
    }

    const selectedDepartmentName = useMemo(() => {
        if (!formData.department_id) return null
        return departments?.find(d => d.id === formData.department_id)?.name || null
    }, [departments, formData.department_id])

    const selectedPropertyName = useMemo(() => {
        if (formData.target_property_id) {
            return properties?.find(p => p.id === formData.target_property_id)?.name || t('editor.selected_property', 'selected property')
        }
        return currentProperty?.name || t('editor.current_property', 'current property')
    }, [currentProperty?.name, formData.target_property_id, properties, t])

    const visibilitySummary = useMemo(() => {
        switch (formData.visibility) {
            case 'all_properties':
                return t('editor.visibility.summary_all_hotels', {
                    defaultValue: 'Visible to all staff in all hotels.'
                })
            case 'property':
                return t('editor.visibility.summary_property', {
                    defaultValue: 'Visible to all staff in {{property}}.',
                    property: selectedPropertyName
                })
            case 'department':
                return t('editor.visibility.summary_department', {
                    defaultValue: 'Visible to {{department}} team in {{property}}.',
                    department: selectedDepartmentName || t('editor.selected_team', 'selected team'),
                    property: selectedPropertyName
                })
            case 'group_department':
                return t('editor.visibility.summary_group_department', {
                    defaultValue: 'Visible to {{department}} team in all hotels.',
                    department: selectedDepartmentName || t('editor.selected_team', 'selected team')
                })
            case 'specific_departments':
                return t('editor.visibility.summary_specific_departments', {
                    defaultValue: 'Visible to {{count}} selected team(s).',
                    count: formData.specific_department_ids.length
                })
            case 'role':
                return t('editor.visibility.summary_role', {
                    defaultValue: 'Visible based on role rules.'
                })
            default:
                return ''
        }
    }, [
        formData.specific_department_ids.length,
        formData.visibility,
        selectedDepartmentName,
        selectedPropertyName,
        t
    ])

    // AI
    const generateWithAI = async (action: 'outline' | 'expand' | 'improve' | 'summarize' | 'checklist' | 'faqs') => {
        if (action === 'outline' && !formData.title && !formData.content) {
            toast.error(t('editor.alerts.title_required'))
            return
        }
        if ((action === 'expand' || action === 'improve' || action === 'summarize' || action === 'checklist' || action === 'faqs') && !formData.content && !formData.title) {
            toast.error(t('editor.write_placeholder'))
            return
        }

        setIsGenerating(true)
        try {
            let result: string | null = null

            // Interactive Checklist generation
            if (action === 'checklist') {
                const items = await aiService.generateChecklist({
                    title: formData.title || 'Hotel Standard Operating Procedure',
                    content: formData.content || formData.title,
                    language: aiLanguage,
                    count: 6
                })
                if (items && items.length > 0) {
                    updateField('checklist_items', items)
                    toast.success(t('editor.alerts.checklist_success', { defaultValue: `Generated ${items.length} interactive checklist steps!` }))
                } else {
                    toast.error(t('editor.alerts.ai_failed'))
                }
                setIsGenerating(false)
                return
            }

            // Operational FAQs generation
            if (action === 'faqs') {
                const faqs = await aiService.generateFAQs({
                    title: formData.title || 'Hotel Standard Operating Procedure',
                    content: formData.content || formData.title,
                    language: aiLanguage,
                    count: 4
                })
                if (faqs && faqs.length > 0) {
                    updateField('faq_items', faqs)
                    toast.success(t('editor.alerts.faqs_success', { defaultValue: `Generated ${faqs.length} operational FAQs!` }))
                } else {
                    toast.error(t('editor.alerts.ai_failed'))
                }
                setIsGenerating(false)
                return
            }

            // Content generation actions (outline, expand, improve)
            if (action === 'outline') {
                const outlineSeed = formData.content?.trim()
                    ? `Create a structured outline from this content with clear sections, numbered steps, and callout-worthy highlights:\n\n${formData.content}`
                    : `Create a detailed outline for this article topic: ${formData.title}`
                result = await aiService.improveContent(outlineSeed, 'expand', aiLanguage, 'html', beautifyOptions)
            } else if (action === 'expand') {
                result = await aiService.improveContent(formData.content, 'expand', aiLanguage, 'html', beautifyOptions)
            } else if (action === 'improve') {
                result = await aiService.improveContent(formData.content, 'professional', aiLanguage, 'html', beautifyOptions)
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
                    updateField('summary', extractTextFromAiResponse(summaryResult))
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
                    let cleanDesc = extractTextFromAiResponse(descResult).replace(/^["']|["']$/g, '').trim()

                    // Only filter non-ASCII if English-only mode (to remove Chinese mistakes)
                    if (aiLanguage === 'English') {
                        cleanDesc = cleanDesc.replace(/[^\p{ASCII}]/gu, '').trim()
                    }
                    updateField('description', cleanDesc)
                }

                toast.success('Summary and description generated!')
                setIsGenerating(false)
                return
            }

            // For content actions only - just update content
            if (result) {
                const sourceForRetention = action === 'outline' ? undefined : formData.content
                const minRetentionRatio = action === 'outline' ? 0 : 0.4
                const preparedHtml = finalizeAiHtmlForEditor(result, sourceForRetention, minRetentionRatio)
                if (preparedHtml) {
                    updateField('content', preparedHtml)
                }
            }
            toast.success(t('editor.alerts.ai_success'))
        } catch (_error) {
            toast.error(t('editor.alerts.ai_failed'))
        } finally {
            setIsGenerating(false)
        }
    }

    // AI Beautify Function
    const beautifyArticle = async () => {
        if (!formData.content || formData.content.trim().length < 10) {
            toast.error('Please add some content before beautifying.')
            return
        }

        setIsGenerating(true)
        try {
            const result = await aiService.beautifyArticle(
                formData.content,
                formData.content_type,
                aiLanguage,
                'professional',
                beautifyOptions
            )

            if (result) {
                const preparedHtml = finalizeAiHtmlForEditor(result, formData.content, 0.6)
                if (!preparedHtml) {
                    toast.error('AI beautification returned empty content. Please try again.')
                    return
                }

                updateField('content', preparedHtml)
                toast.success('Content beautified with AI. Existing options were applied.')
            } else {
                toast.error('AI beautification failed. Please try again.')
            }
        } catch (error) {
            console.error('AI beautification error:', error)
            toast.error('AI beautification failed. Please try again.')
        } finally {
            setIsGenerating(false)
        }
    }

    const calculateEstimatedReadTime = useCallback((value: string): number | null => {
        if (!value) return null
        // Use recursive sanitization to prevent bypass attempts with nested tags
        let previous: string;
        let plainText = value;
        do {
          previous = plainText;
          plainText = previous.replace(/<[^>]*>/g, ' ');
        } while (plainText !== previous);
        plainText = plainText.replace(/\s+/g, ' ').trim()
        if (!plainText) return null
        return Math.max(1, Math.round(plainText.split(' ').length / 200))
    }, [])

    const saveArticle = async (status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED') => {
        if (isSaving || isSavingInFlightRef.current) return

        if (!formData.title.trim()) {
            toast.error(t('editor.alerts.title_required'))
            return
        }

        if (isUploading) {
            toast.error(t('editor.alerts.file_uploading'))
            return
        }

        if ((formData.visibility === 'department' || formData.visibility === 'group_department') && !formData.department_id) {
            toast.error(t('editor.alerts.dept_required'))
            return
        }

        const rawPropertyId = formData.target_property_id || currentProperty?.id || null
        if (formData.visibility === 'property' && !isUuid(rawPropertyId)) {
            toast.error(t('editor.alerts.property_required', { defaultValue: 'Please select a specific property.' }))
            return
        }

        isSavingInFlightRef.current = true
        setIsSaving(true)

        let finalSummary = formData.summary
        let finalDescription = formData.description

        if (formData.content && formData.content.length > 100) {
            const needsSummary = !formData.summary || formData.summary.trim().length < 10
            const needsDescription = !formData.description || formData.description.trim().length < 5

            if (needsSummary || needsDescription) {
                toast.info('🤖 Auto-generating summary...', { duration: 2000 })
                try {
                    // Use recursive sanitization to prevent bypass attempts with nested tags
                    let previous: string;
                    let cleanContent = formData.content;
                    do {
                      previous = cleanContent;
                      cleanContent = previous.replace(/<[^>]*>/g, ' ');
                    } while (cleanContent !== previous);
                    cleanContent = cleanContent.replace(/\s+/g, ' ').trim()
                    if (needsSummary) {
                        const summaryResult = await aiService.improveContent(
                            `Write a 2-3 sentence professional summary of this hotel document.\n\nDOCUMENT:\n${cleanContent.substring(0, 3000)}\n\nWrite ONLY the summary in English.`,
                            'shorten',
                            'English'
                        )
                        if (summaryResult) {
                            const normalizedSummary = extractTextFromAiResponse(summaryResult)
                            finalSummary = normalizedSummary
                            updateField('summary', normalizedSummary)
                        }
                    }
                    if (needsDescription) {
                        const descResult = await aiService.improveContent(
                            `Create a 10-15 word tagline for this document.\n\nTITLE: ${formData.title}\nCONTENT: ${cleanContent.substring(0, 1000)}\n\nWrite ONLY the tagline in English.`,
                            'shorten',
                            'English'
                        )
                        if (descResult) {
                            const cleanDesc = extractTextFromAiResponse(descResult)
                                .replace(/^["']|["']$/g, '')
                                .replace(/[^\p{ASCII}]/gu, '')
                                .trim()
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
            const normalizedPropertyId = formData.visibility === 'all_properties' ||
                formData.visibility === 'group_department' ||
                formData.visibility === 'specific_departments'
                ? null
                : (isUuid(rawPropertyId) ? rawPropertyId : null)

            const estimatedReadTime = formData.estimated_read_time ?? calculateEstimatedReadTime(formData.content)
            let savedArticleId: string | null = null
            let savedArticleData = null
            let redirectToArticleId: string | null = null

            // Persist structured operational sections + compliance scorecard + visual
            // asset reference through the existing `content_data` jsonb column
            // (namespaced), preserving any unrelated keys already stored there.
            const knowledgeMeta: KnowledgeArticleMeta = {
                critical_control_points: toStringList(formData.critical_control_points),
                service_benchmarks: toStringList(formData.service_benchmarks),
                contingency_protocols: toStringList(formData.contingency_protocols),
                visual_asset: formData.visual_asset,
                ai_compliance_score: formData.ai_compliance_score,
                ai_compliance_notes: toStringList(formData.ai_compliance_notes),
                ai_compliance_checked_at: formData.ai_compliance_checked_at || null,
                ai_models_used: toStringList(formData.ai_models_used),
                ai_model_used: formData.ai_model_used || null,
                ai_provider_used: formData.ai_provider_used || null,
                ai_cost_tier: formData.ai_cost_tier || null,
                ai_total_duration_ms: formData.ai_total_duration_ms,
            }
            const baseContentData = writeKnowledgeMeta(loadedContentDataRef.current, knowledgeMeta)
            const nextContentData = {
                ...((baseContentData as any) || {}),
                ...(releaseNotes.trim() ? { release_notes: releaseNotes.trim() } : {}),
                ...(localAddendumEn.trim() || localAddendumAr.trim()
                    ? {
                        local_addendum: {
                            en: localAddendumEn.trim() || null,
                            ar: localAddendumAr.trim() || null,
                            updated_at: new Date().toISOString()
                        }
                    }
                    : {})
            }

            const articleData: Database['public']['Tables']['documents']['Update'] = {
                title: formData.title,
                description: finalDescription || null,
                summary: finalSummary || null,
                content: formData.content || null,
                title_ar: formData.title_ar.trim() || null,
                description_ar: formData.description_ar.trim() || null,
                summary_ar: formData.summary_ar.trim() || null,
                content_ar: formData.content_ar.trim() || null,
                sop_code: formData.sop_code.trim() || null,
                file_url: formData.file_url || null,
                content_type: formData.content_type,
                visibility: formData.visibility,
                requires_acknowledgment: formData.requires_acknowledgment,
                status: status,
                organization_id: currentOrganization?.id || null,
                hotel_id: currentHotel?.id || normalizedPropertyId || null,
                brand_id: currentBrand?.id || null,
                scope_type: formData.scope_type || 'organization',
                is_master_template: isPlatformAdmin ? Boolean(formData.is_master_template) : false,
                property_id: normalizedPropertyId,
                department_id: isUuid(formData.department_id) ? formData.department_id : null,
                category_id: isUuid(formData.category_id) ? formData.category_id : null,
                linked_training_id: isUuid(formData.linked_training_id) ? formData.linked_training_id : null,
                updated_by: user?.id,
                updated_at: new Date().toISOString(),
                estimated_read_time: estimatedReadTime,
                checklist_items: (formData.checklist_items || []) as unknown as Json,
                faq_items: (formData.faq_items || []) as unknown as Json,
                video_url: formData.video_url || null,
                images: (formData.images || []) as unknown as Json,
                content_data: nextContentData as Json,
            }

            if (isEditing && id) {
                const { data, error } = await supabase
                    .from('documents')
                    .update(articleData)
                    .eq('id', id)
                    .select()
                    .single()
                if (error) throw error
                savedArticleId = id
                savedArticleData = data

                // Save specific departments access if needed
                if (formData.visibility === 'specific_departments') {
                    await supabase.from('document_department_access').delete().eq('document_id', id)
                    if (formData.specific_department_ids.length > 0) {
                        const accessData = formData.specific_department_ids.map(deptId => ({
                            document_id: id,
                            department_id: deptId
                        }))
                        await supabase.from('document_department_access').insert(accessData)
                    }
                }

                if (status === 'PENDING_REVIEW') {
                    await notifyReviewersOfSubmission(id, formData.title)
                }

                const typeLabel = t(`content_types.${formData.content_type}`, { defaultValue: formData.content_type.toUpperCase() })
                toast.success(status === 'PENDING_REVIEW'
                    ? t('editor.alerts.submitted_for_review')
                    : t('editor.alerts.update_success', { type: typeLabel }))
            } else {
                const insertPayload: Database['public']['Tables']['documents']['Insert'] = {
                    ...articleData,
                    title: formData.title,
                    status: status,
                    visibility: formData.visibility,
                    organization_id: currentOrganization?.id || null,
                    hotel_id: currentHotel?.id || normalizedPropertyId || null,
                    brand_id: currentBrand?.id || null,
                    scope_type: formData.scope_type || 'organization',
                    is_master_template: isPlatformAdmin ? Boolean(formData.is_master_template) : false,
                    created_by: user?.id
                }
                const { data, error } = await supabase
                    .from('documents')
                    .insert(insertPayload)
                    .select()
                    .single()
                if (error) throw error
                savedArticleId = data.id
                savedArticleData = data

                // Save specific departments access if needed
                if (formData.visibility === 'specific_departments' && formData.specific_department_ids.length > 0) {
                    const accessData = formData.specific_department_ids.map(deptId => ({
                        document_id: data.id,
                        department_id: deptId
                    }))
                    await supabase.from('document_department_access').insert(accessData)
                }

                if (status === 'PENDING_REVIEW') {
                    await notifyReviewersOfSubmission(data.id, formData.title)
                }

                const typeLabel = t(`content_types.${formData.content_type}`, { defaultValue: formData.content_type.toUpperCase() })
                toast.success(status === 'PENDING_REVIEW'
                    ? t('editor.alerts.submitted_for_review')
                    : (isEditing ? t('editor.alerts.update_success', { type: typeLabel }) : t('editor.alerts.save_success', { type: typeLabel })))
                
                // Clear draft on successful save
                clearDraft()
            }

            // Immediately mark navigation as safe and clear drafts
            allowUnsafeNavigationRef.current = true
            setAllowUnsafeNavigation(true)
            clearDraft()
            markSaved()

            let syncedArticleData = savedArticleData
            if (savedArticleId) {
                try {
                    const hydratedArticle = await KnowledgeService.getArticleById(savedArticleId, user?.id)
                    if (hydratedArticle) {
                        syncedArticleData = hydratedArticle
                    }
                } catch {
                    // Fall back to savedArticleData
                }
            }

            const mergeArticleIntoCollection = (existing: any) => {
                if (!savedArticleId || !syncedArticleData || !existing) return existing

                if (Array.isArray(existing)) {
                    return existing.map((item) =>
                        item?.id === savedArticleId ? { ...item, ...syncedArticleData } : item
                    )
                }

                if (Array.isArray(existing.articles)) {
                    return {
                        ...existing,
                        articles: existing.articles.map((item) =>
                            item?.id === savedArticleId ? { ...item, ...syncedArticleData } : item
                        )
                    }
                }

                return existing
            }

            if (savedArticleId && syncedArticleData) {
                queryClient.setQueryData(
                    ['knowledge-article', savedArticleId, user?.id],
                    syncedArticleData
                )
                queryClient.setQueriesData(
                    { queryKey: ['knowledge-article', savedArticleId], exact: false },
                    (existing: Record<string, unknown> | undefined) => 
                        existing ? { ...existing, ...syncedArticleData } : syncedArticleData
                )
                queryClient.setQueriesData(
                    { queryKey: ['knowledge-articles'], exact: false },
                    mergeArticleIntoCollection
                )
                queryClient.setQueriesData(
                    { queryKey: ['knowledge-featured'], exact: false },
                    mergeArticleIntoCollection
                )
                queryClient.setQueriesData(
                    { queryKey: ['knowledge-recent'], exact: false },
                    mergeArticleIntoCollection
                )
            }

            // Background invalidations
            queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] })
            queryClient.invalidateQueries({ queryKey: ['knowledge-department-counts-global'] })
            queryClient.invalidateQueries({ queryKey: ['knowledge-type-counts'] })
            queryClient.invalidateQueries({ queryKey: ['knowledge-featured'] })
            queryClient.invalidateQueries({ queryKey: ['knowledge-recent'] })
            if (savedArticleId) {
                queryClient.invalidateQueries({ queryKey: ['knowledge-article', savedArticleId] })
                queryClient.invalidateQueries({ queryKey: ['knowledge-related', savedArticleId] })
            }

            // Always navigate to the article detail page after publish or new article creation
            const targetArticleId = savedArticleId || savedArticleData?.id || id
            if (targetArticleId) {
                navigate(`/knowledge/${targetArticleId}`, { replace: true })
            }
        } catch (error: any) {
            console.error('Error in saveArticle:', error)
            const errorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error))
            toast.error(t('editor.alerts.save_error', { error: errorMessage }))
        } finally {
            isSavingInFlightRef.current = false
            setIsSaving(false)
        }
    }

    const canSubmitForReview = useMemo(() =>
        ['author', 'department_head', 'property_hr', 'property_manager'].includes(primaryRole || ''),
        [primaryRole]
    )
    const canDirectPublish = useMemo(() =>
        ['administrator', 'knowledge_manager', 'training_manager', 'property_manager', 'regional_admin', 'corporate_admin', 'super_admin', 'admin'].includes(primaryRole || ''),
        [primaryRole]
    )

    const handleUploadPdf = useCallback(async (file: File) => {
        if (file.type !== 'application/pdf') {
            toast.error(t('editor.alerts.only_pdf', 'Only PDF files are allowed'))
            return
        }
        if (!user?.id) {
            toast.error(t('editor.alerts.user_error'))
            return
        }

        setIsUploading(true)
        try {
            const scanResult = await scanFile(file, {
                bucket: 'documents',
                context: 'knowledge_editor_upload'
            })
            if (!scanResult.safe) {
                throw new Error(scanResult.message || 'File failed security scan')
            }

            const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
            const { error } = await supabase.storage.from('documents').upload(fileName, file)
            if (error) throw error

            updateField('file_url', fileName)
            updateField('storage_path', fileName)
            if (!formData.title) updateField('title', file.name.replace('.pdf', ''))
            toast.success(t('editor.alerts.upload_success', 'Document uploaded successfully'))
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Upload failed')
        } finally {
            setIsUploading(false)
        }
    }, [formData.title, t, updateField, user?.id])

    const readinessItems: ReadinessCheckItem[] = useMemo(() => {
        const hasEnTitle = Boolean(formData.title.trim())
        const hasSopCode = Boolean(formData.sop_code.trim())
        const hasDept = Boolean(formData.department_id) || formData.visibility === 'all_properties'
        const hasSummary = Boolean(formData.summary.trim())
        const hasArContent = Boolean(formData.title_ar.trim() && formData.content_ar.trim())
        const plainLength = (formData.content || '').replace(/<[^>]*>/g, '').trim().length
        const hasAdequateBody = plainLength >= 120
        const hasProtocols = (formData.checklist_items?.length > 0) || (formData.critical_control_points?.length > 0) || (formData.service_benchmarks?.length > 0) || (formData.contingency_protocols?.length > 0)
        const hasMedia = Boolean(formData.video_url || formData.file_url || (formData.images && formData.images.length > 0))

        return [
            {
                id: 'title',
                label: t('editor.readiness_title', 'English Title'),
                description: t('editor.readiness_title_desc', 'Clear, professional English title'),
                passed: hasEnTitle,
                importance: 'critical',
                tabTarget: 'content',
            },
            {
                id: 'sop_code',
                label: t('editor.readiness_code', 'Standard SOP Code'),
                description: t('editor.readiness_code_desc', 'Formal operational identifier (e.g., FO-SOP-014)'),
                passed: hasSopCode,
                importance: 'critical',
                tabTarget: 'content',
            },
            {
                id: 'department',
                label: t('editor.readiness_dept', 'Department & Audience'),
                description: t('editor.readiness_dept_desc', 'Clear operational department ownership'),
                passed: hasDept,
                importance: 'critical',
                inspectorTab: 'publishing',
            },
            {
                id: 'body',
                label: t('editor.readiness_body', 'Procedure Content'),
                description: t('editor.readiness_body_desc', 'Substantial operational instructions (120+ characters)'),
                passed: hasAdequateBody,
                importance: 'critical',
                tabTarget: 'content',
            },
            {
                id: 'summary',
                label: t('editor.readiness_summary', 'Executive TL;DR Summary'),
                description: t('editor.readiness_summary_desc', 'Quick executive summary for busy staff'),
                passed: hasSummary,
                importance: 'recommended',
                inspectorTab: 'governance',
            },
            {
                id: 'arabic',
                label: t('editor.readiness_ar', 'Arabic Localization'),
                description: t('editor.readiness_ar_desc', 'Bilingual title and procedure body (KSA compliance)'),
                passed: hasArContent,
                importance: 'recommended',
                tabTarget: 'content',
            },
            {
                id: 'protocols',
                label: t('editor.readiness_protocols', 'Execution Protocols'),
                description: t('editor.readiness_protocols_desc', 'Interactive checklist, CCPs, or luxury benchmarks'),
                passed: hasProtocols,
                importance: 'recommended',
                tabTarget: 'protocols',
            },
            {
                id: 'media',
                label: t('editor.readiness_media', 'Visual & Media Reference'),
                description: t('editor.readiness_media_desc', 'Attached video tutorial, reference PDF, or photo guide'),
                passed: hasMedia,
                importance: 'optional',
                inspectorTab: 'media',
            },
        ]
    }, [formData, t])

    const readinessScore = useMemo(() => {
        let score = 0
        readinessItems.forEach(item => {
            if (item.passed) {
                if (item.importance === 'critical') score += 20
                else if (item.importance === 'recommended') score += 5
                else if (item.importance === 'optional') score += 5
            }
        })
        return Math.min(100, Math.max(0, score))
    }, [readinessItems])

    const handleNavigateToReadinessItem = useCallback((item: ReadinessCheckItem) => {
        if (item.tabTarget) {
            setMainWorkspaceTab(item.tabTarget)
            if (item.id === 'arabic') {
                setEditLang('ar')
            }
        }
        if (item.inspectorTab) {
            setInspectorTab(item.inspectorTab)
        }
        setIsReadinessDrawerOpen(false)
    }, [])

    if (isForbidden || primaryRole === 'staff' || primaryRole === 'learner') {
        return null
    }

    // Prevent hydration mismatch
    if (!hasMounted && !isEditing) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <UnsavedChangesDialog />

            {/* Restore Draft Prompt */}
            {!isEditing && showRestorePrompt && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            Draft article restored from previous session
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowRestorePrompt(false)} className="text-xs">
                            Keep
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                            clearDraft()
                            setFormData(createEmptyArticleFormData())
                            setShowRestorePrompt(false)
                            toast.success('Draft cleared')
                        }} className="text-xs">
                            Clear Draft
                        </Button>
                    </div>
                </div>
            )}

            {/* Zone 1: Sticky Command & Article Health Bar */}
            <AuthorTopBar
                onBack={() => navigate(-1)}
                isEditing={isEditing}
                title={formData.title}
                sopCode={formData.sop_code}
                status={(formData as any).status || 'draft'}
                isMasterTemplate={Boolean(formData.is_master_template)}
                isSaving={isSaving}
                isAutoSaving={false}
                lastSavedAt={null}
                readinessScore={readinessScore}
                onOpenReadinessDrawer={() => setIsReadinessDrawerOpen(true)}
                editLang={editLang}
                onToggleEditLang={setEditLang}
                hasArContent={Boolean(formData.title_ar.trim() || formData.content_ar.trim())}
                onOpenAiStudio={() => setIsAiStudioOpen(true)}
                onSaveDraft={() => saveArticle('DRAFT')}
                onSubmitPublish={() => saveArticle(canDirectPublish ? 'PUBLISHED' : 'PENDING_REVIEW')}
                canPublish={canDirectPublish || canSubmitForReview}
            />

            {/* Interactive Article Quality & Readiness Drawer */}
            <ArticleReadinessDrawer
                open={isReadinessDrawerOpen}
                onOpenChange={setIsReadinessDrawerOpen}
                readinessScore={readinessScore}
                items={readinessItems}
                onNavigateToItem={handleNavigateToReadinessItem}
            />

            {/* Master SOP Blueprint Banner */}
            {formData.is_master_template && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Crown className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                                    Corporate Master SOP Blueprint
                                </h3>
                                <Badge className="bg-amber-500 text-white text-[10px] h-4 py-0 font-mono font-bold">
                                    Global Standard
                                </Badge>
                                {isEditing && (
                                    <Badge variant="outline" className="text-[10px] h-4 py-0 font-mono border-amber-400 text-amber-800 dark:text-amber-300 font-semibold">
                                        v{(formData as any).current_version || 1}.0
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                                {isEditing && masterDeploymentCount !== null
                                    ? `This Master SOP is currently distributed across ${masterDeploymentCount} hotel properties. Updating will notify property GMs to sync.`
                                    : 'Published directly into the Platform Master Library for cross-property multi-tenant deployment.'}
                            </p>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="sm:w-80 shrink-0">
                            <Label className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block mb-1">
                                Revision Release Notes
                            </Label>
                            <Input
                                placeholder="Explain what changed in this edition..."
                                value={releaseNotes}
                                onChange={e => setReleaseNotes(e.target.value)}
                                className="h-8 text-xs bg-white/80 dark:bg-slate-900 border-amber-300"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Main 2-Panel Authoring Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Zone 2: Main Workspace Canvas (8 cols) */}
                <div className="lg:col-span-8 space-y-5">
                    
                    {/* Property Local Addendum (if inherited from Master SOP) */}
                    {formData.master_source_id && (
                        <Card className="border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-950 dark:text-indigo-200">
                                    <Building className="h-4 w-4 text-indigo-600" />
                                    <span>Property Local Addendum / ملحق المنشأة المحلي</span>
                                </CardTitle>
                                <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80">
                                    This document is inherited from a Corporate Master SOP. You can document property-specific extensions, localized emergency contacts, or floor layouts below. These local notes are preserved and never overwritten by upstream master syncs.
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-2">
                                <div>
                                    <Label className="text-xs font-semibold text-foreground">Local Property Notes (English)</Label>
                                    <Textarea
                                        placeholder="e.g. For this property, Night Duty Manager extension is #4402. Muster point is West Courtyard."
                                        value={localAddendumEn}
                                        onChange={e => setLocalAddendumEn(e.target.value)}
                                        rows={3}
                                        className="text-xs mt-1 bg-background"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-foreground">ملحق المنشأة المحلي (بالعربية)</Label>
                                    <Textarea
                                        dir="rtl"
                                        placeholder="مثال: لهذه المنشأة، تحويلة مدير الفترة الليلية #4402 ونقطة التجمع في الساحة الغربية."
                                        value={localAddendumAr}
                                        onChange={e => setLocalAddendumAr(e.target.value)}
                                        rows={3}
                                        className="text-xs mt-1 bg-background font-arabic"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Focused 3-Tab Authoring Experience */}
                    <Tabs value={mainWorkspaceTab} onValueChange={(v) => setMainWorkspaceTab(v as 'content' | 'protocols' | 'preview')} className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <TabsList className="h-9">
                                <TabsTrigger value="content" className="text-xs h-7 px-3 gap-1.5 font-medium">
                                    <FileText className="w-3.5 h-3.5 text-hotel-gold" />
                                    <span>✍️ {t('editor.tabs.procedure', 'Procedure & Content')}</span>
                                </TabsTrigger>
                                <TabsTrigger value="protocols" className="text-xs h-7 px-3 gap-1.5 font-medium">
                                    <CheckSquare className="w-3.5 h-3.5 text-hotel-gold" />
                                    <span>📋 {t('editor.tabs.protocols', 'Operational Protocols')}</span>
                                    {((formData.checklist_items?.length || 0) + (formData.critical_control_points?.length || 0) + (formData.service_benchmarks?.length || 0)) > 0 && (
                                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ms-1">
                                            {(formData.checklist_items?.length || 0) + (formData.critical_control_points?.length || 0) + (formData.service_benchmarks?.length || 0)}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="preview" className="text-xs h-7 px-3 gap-1.5 font-medium">
                                    <Eye className="w-3.5 h-3.5 text-hotel-gold" />
                                    <span>👁️ {t('editor.tabs.preview', 'Live Interactive Preview')}</span>
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{calculateEstimatedReadTime(formData.content) || 1} min read</span>
                            </div>
                        </div>

                        {/* TAB 1: Procedure & Content */}
                        <TabsContent value="content" className="space-y-5 mt-0">
                            {/* Article Basics: Title, SOP Code, Read time, format selector, duplicate warning, AI tag suggestions */}
                            <ArticleBasicsCard
                                title={formData.title}
                                titleAr={formData.title_ar}
                                description={formData.description}
                                descriptionAr={formData.description_ar}
                                sopCode={formData.sop_code}
                                estimatedReadTime={formData.estimated_read_time}
                                contentType={formData.content_type}
                                editLang={editLang}
                                contentTypes={CONTENT_TYPE_CONFIG}
                                onUpdateField={updateField}
                                showDuplicateWarning={showDuplicateWarning}
                                duplicateCheckResult={duplicateCheckResult}
                                onDismissDuplicateWarning={() => {
                                    setShowDuplicateWarning(false)
                                    setDismissedDuplicateTitle(formData.title)
                                }}
                                tagSuggestions={tagSuggestions}
                                isGeneratingTags={isGeneratingTags}
                                onGenerateTagSuggestions={() => generateSuggestions(formData.title, formData.content, formData.description)}
                                onClearTagSuggestions={clearSuggestions}
                            />

                            {/* AI Co-Authoring Ribbon */}
                            <AICoWriterRibbon
                                aiLanguage={aiLanguage}
                                onAiLanguageChange={setAiLanguage}
                                isGenerating={isGenerating}
                                hasContent={Boolean(formData.content)}
                                onGenerate={generateWithAI}
                            />

                            {/* Rich Text Editor Card */}
                            <Card className="shadow-xs border-border bg-card">
                                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-foreground">
                                            {editLang === 'ar' ? 'المحتوى التشغيلي بالعربية' : 'Operational Procedure Body'}
                                        </h3>
                                        <Badge variant="outline" className="text-[10px]">
                                            {editLang === 'ar' ? 'العربية' : 'English'}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={beautifyArticle}
                                        disabled={isGenerating || !formData.content}
                                        className="h-7 text-xs text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 gap-1 font-medium"
                                    >
                                        <Palette className="w-3.5 h-3.5 text-purple-600" />
                                        <span>AI Beautify</span>
                                    </Button>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    {editLang === 'ar' && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-hotel-navy dark:text-hotel-gold mb-2">
                                            <Languages className="h-3.5 w-3.5" />
                                            {t('editor.editing_arabic_body', 'Editing the Arabic body (المحتوى العربي)')}
                                        </div>
                                    )}
                                    <RichTextEditor
                                        key={`rte-${editLang}`}
                                        value={editLang === 'en' ? formData.content : formData.content_ar}
                                        onChange={v => updateField(editLang === 'en' ? 'content' : 'content_ar', v)}
                                        placeholder={t('editor.write_placeholder', 'Start typing the hotel operational procedure or policy standard here...')}
                                        minHeight={340}
                                        direction={editLang === 'ar' ? 'rtl' : 'ltr'}
                                        onPickMedia={pickMediaFromLibrary}
                                    />
                                </CardContent>
                            </Card>

                            {/* Video Content Block (if video format or video url exists) */}
                            {(formData.content_type === 'video' || formData.video_url) && (
                                <VideoContentBuilder
                                    value={formData.video_url}
                                    onChange={v => updateField('video_url', v)}
                                />
                            )}
                        </TabsContent>

                        {/* TAB 2: Operational Protocols (Checklists, CCPs, Benchmarks, FAQs) */}
                        <TabsContent value="protocols" className="space-y-5 mt-0">
                            <OperationalProtocolsTab
                                checklistItems={formData.checklist_items || []}
                                onChecklistChange={items => updateField('checklist_items', items)}
                                criticalControlPoints={formData.critical_control_points || []}
                                onCriticalControlPointsChange={items => updateField('critical_control_points', items)}
                                serviceBenchmarks={formData.service_benchmarks || []}
                                onServiceBenchmarksChange={items => updateField('service_benchmarks', items)}
                                contingencyProtocols={formData.contingency_protocols || []}
                                onContingencyProtocolsChange={items => updateField('contingency_protocols', items)}
                                faqItems={formData.faq_items || []}
                                onFaqItemsChange={items => updateField('faq_items', items)}
                                title={formData.title}
                                isGenerating={isGenerating}
                                onGenerateWithAI={generateWithAI}
                            />
                        </TabsContent>

                        {/* TAB 3: Live Interactive Preview */}
                        <TabsContent value="preview" className="space-y-5 mt-0">
                            <div ref={previewRef} className="space-y-8 min-h-[400px] p-6 border rounded-xl bg-card">
                                {/* Standard Article HTML Preview */}
                                {previewHtml ? (
                                    <InlineErrorBoundary>
                                        <div
                                            className="prose max-w-none text-foreground dark:text-slate-100"
                                            dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }}
                                        />
                                    </InlineErrorBoundary>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic py-8 text-center">
                                        {t('editor.preview_empty', 'No article body content yet. Start writing on the Procedure tab.')}
                                    </p>
                                )}

                                {/* Live Video Preview */}
                                {formData.video_url && (
                                    <div className="pt-6 border-t">
                                        <h4 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                                            <VideoIcon className="w-4 h-4 text-red-500" />
                                            Video Demonstration
                                        </h4>
                                        <VideoPlayer videoUrl={formData.video_url} title={formData.title} />
                                    </div>
                                )}

                                {/* Live Interactive Checklist Preview */}
                                {formData.checklist_items && formData.checklist_items.length > 0 && (
                                    <div className="pt-6 border-t">
                                        <h4 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                                            <CheckSquare className="w-4 h-4 text-orange-500" />
                                            Interactive SOP Execution Checklist
                                        </h4>
                                        <ChecklistRenderer items={formData.checklist_items} />
                                    </div>
                                )}

                                {/* Live Interactive FAQ Accordion Preview */}
                                {formData.faq_items && formData.faq_items.length > 0 && (
                                    <div className="pt-6 border-t">
                                        <h4 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                                            <HelpCircle className="w-4 h-4 text-yellow-500" />
                                            Operational FAQs & Edge Cases
                                        </h4>
                                        <FAQAccordion items={formData.faq_items} />
                                    </div>
                                )}

                                {/* Live Image Gallery Preview */}
                                {formData.images && formData.images.length > 0 && (
                                    <div className="pt-6 border-t">
                                        <h4 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4 text-blue-500" />
                                            Step-by-Step Visual Gallery
                                        </h4>
                                        <ImageGalleryRenderer images={formData.images} />
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Related Articles (When editing) */}
                    {isEditing && id && (
                        <RelatedArticlesEditor documentId={id} relatedArticles={relatedArticles} onUpdate={refetchRelated} />
                    )}

                    {/* AI Document Summary */}
                    {formData.content && formData.content.length > 100 && (
                        <AIDocumentSummary
                            content={formData.content}
                            title={formData.title}
                        />
                    )}
                </div>

                {/* Zone 3: Streamlined Inspector (Publishing, Media, Governance) */}
                <div className="lg:col-span-4 space-y-4">
                    <AuthorInspector
                        activeTab={inspectorTab}
                        onActiveTabChange={setInspectorTab}
                        formData={formData}
                        onUpdateField={updateField}
                        departments={departments || []}
                        properties={properties || []}
                        categories={categories || []}
                        trainingModules={trainingModules || []}
                        currentProperty={currentProperty}
                        currentBrand={currentBrand}
                        currentHotel={currentHotel}
                        isPlatformAdmin={isPlatformAdmin}
                        user={user}
                        visibilityOptions={VISIBILITY_OPTIONS}
                        visibilitySummary={visibilitySummary}
                        onOpenDocumentPicker={() => setShowDocumentPicker(true)}
                        onOpenMediaPicker={() => {
                            mediaPickKindRef.current = 'image'
                            mediaPickResolveRef.current = null
                            setShowMediaPicker(true)
                        }}
                        onOpenVideoPicker={handleOpenVideoPicker}
                        isUploadingPdf={isUploading}
                        onUploadPdf={handleUploadPdf}
                        onGenerateSummary={() => generateWithAI('summarize')}
                        isGeneratingSummary={isGenerating}
                        isEditing={isEditing}
                        releaseNotes={releaseNotes}
                        onReleaseNotesChange={setReleaseNotes}
                        masterDeploymentCount={masterDeploymentCount}
                    />
                </div>
            </div>

            {/* Document Library Picker Dialog */}
            <DocumentPicker
                open={showDocumentPicker}
                onOpenChange={setShowDocumentPicker}
                onSelect={(docs) => {
                    if (docs.length > 0) {
                        updateField('file_url', docs[0].file_url)
                        if (!formData.title) updateField('title', docs[0].title)
                        toast.success('Document selected from library')
                    }
                }}
                config={{ allowedTypes: ['pdf'], multiple: false }}
                title="Select Document from Library"
            />

            {/* Central Media Library Picker Dialog */}
            <MediaPicker
                open={showMediaPicker}
                onOpenChange={(open) => {
                    setShowMediaPicker(open)
                    // Dismissed without picking -> resolve the editor's pending request.
                    if (!open && mediaPickResolveRef.current) {
                        mediaPickResolveRef.current(null)
                        mediaPickResolveRef.current = null
                    }
                }}
                onSelect={handleMediaSelect}
                config={{
                    allowedTypes: mediaPickKindRef.current ? [mediaPickKindRef.current] : undefined,
                    multiple: false
                }}
                title={mediaPickKindRef.current === 'video' ? t('editor.select_video_title', 'Select Video from Hotel Library') : t('editor.select_media_title', 'Select Media from Hotel Library')}
            />

            {/* AI Knowledge Article & SOP Studio Modal */}
            <AIArticleStudioModal
                isOpen={isAiStudioOpen}
                onClose={() => setIsAiStudioOpen(false)}
                defaultContentType={formData.content_type}
                defaultDepartment={departments?.find(d => d.id === formData.department_id)?.name || 'Front Office'}
                onApplyArticle={(article) => {
                    const patch = generatedArticleToFormPatch(article)
                    setFormData((prev) => ({
                        ...prev,
                        title: patch.title || prev.title,
                        description: patch.description || prev.description,
                        summary: patch.summary || prev.summary,
                        content: patch.content || prev.content,
                        title_ar: patch.title_ar || prev.title_ar,
                        description_ar: patch.description_ar || prev.description_ar,
                        summary_ar: patch.summary_ar || prev.summary_ar,
                        content_ar: patch.content_ar || prev.content_ar,
                        sop_code: patch.sop_code || prev.sop_code,
                        estimated_read_time: patch.estimated_read_time ?? prev.estimated_read_time,
                        content_type: patch.content_type || prev.content_type,
                        checklist_items: patch.checklist_items.length ? patch.checklist_items : prev.checklist_items,
                        faq_items: patch.faq_items.length ? patch.faq_items : prev.faq_items,
                        ai_tags: patch.ai_tags.length ? patch.ai_tags : prev.ai_tags,
                        critical_control_points: patch.meta.critical_control_points.length ? patch.meta.critical_control_points : prev.critical_control_points,
                        service_benchmarks: patch.meta.service_benchmarks.length ? patch.meta.service_benchmarks : prev.service_benchmarks,
                        contingency_protocols: patch.meta.contingency_protocols.length ? patch.meta.contingency_protocols : prev.contingency_protocols,
                        visual_asset: patch.meta.visual_asset ?? prev.visual_asset,
                        ai_compliance_score: patch.meta.ai_compliance_score ?? prev.ai_compliance_score,
                        ai_compliance_notes: patch.meta.ai_compliance_notes.length ? patch.meta.ai_compliance_notes : prev.ai_compliance_notes,
                        ai_compliance_checked_at: patch.meta.ai_compliance_checked_at || prev.ai_compliance_checked_at,
                        ai_models_used: patch.meta.ai_models_used.length ? patch.meta.ai_models_used : prev.ai_models_used,
                        ai_model_used: patch.meta.ai_model_used || prev.ai_model_used,
                        ai_provider_used: patch.meta.ai_provider_used || prev.ai_provider_used,
                        ai_cost_tier: patch.meta.ai_cost_tier || prev.ai_cost_tier,
                        ai_total_duration_ms: patch.meta.ai_total_duration_ms ?? prev.ai_total_duration_ms,
                    }))
                    toast.success(`Generated 5-star ${article.content_type.toUpperCase()} applied to editor!`)
                }}
            />
        </div>
    )
}
