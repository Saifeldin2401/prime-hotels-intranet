/**
 * KnowledgeEditor
 * 
 * Simplified article editor for Knowledge Base.
 * Uses 'documents' table.
 */

import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import {
    AIDocumentSummary,
    ChecklistBuilder,
    ChecklistRenderer,
    FAQAccordion,
    FAQBuilder,
    ImageGalleryRenderer,
    RelatedArticlesEditor,
    VideoContentBuilder,
    VideoPlayer,
    VisualContentBuilder
} from '@/components/knowledge'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useProperty } from '@/contexts/PropertyContext'
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
import { supabase } from '@/lib/supabase'
import * as KnowledgeService from '@/services/knowledgeService'
import { triggerService } from '@/services/triggerService'
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
    Building2,
    Check,
    CheckSquare,
    ChevronDown,
    Clock,
    ExternalLink,
    Eye,
    FileText,
    FolderOpen,
    Globe,
    HelpCircle,
    Image as ImageIcon,
    Layers,
    Link as LinkIcon,
    List,
    Loader2,
    Palette,
    RefreshCw,
    Save,
    Send,
    ShieldCheck,
    Sparkles,
    Tag,
    Upload,
    Video as VideoIcon,
    Wand2,
    X
} from 'lucide-react'
import { marked } from 'marked'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

interface ArticleFormData {
    title: string
    description: string
    summary: string              // TL;DR summary for quick reading
    content: string
    file_url: string
    storage_path: string
    content_type: string
    visibility: KnowledgeVisibility
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
    // Index signature for useFormPersistence compatibility
    [key: string]: unknown
}

const createEmptyArticleFormData = (): ArticleFormData => ({
    title: '',
    description: '',
    summary: '',
    content: '',
    file_url: '',
    storage_path: '',
    content_type: 'document',
    visibility: 'all_properties',
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

export default function KnowledgeEditor() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { t } = useTranslation(['knowledge', 'common'])
    const { user, profile, primaryRole } = useAuth()
    const { currentProperty } = useProperty()
    const queryClient = useQueryClient()
    const isEditing = Boolean(id)

    // Mount and hydration tracking
    const [hasMounted, setHasMounted] = useState(false)
    const [showRestorePrompt, setShowRestorePrompt] = useState(false)
    const [allowUnsafeNavigation, setAllowUnsafeNavigation] = useState(false)
    const allowUnsafeNavigationRef = useRef(false)
    const restoredDraftRef = useRef(false)

    const [formData, setFormData] = useState<ArticleFormData>(() => createEmptyArticleFormData())

    const formPersistence = useFormPersistence<ArticleFormData>({
        key: `knowledge_editor_${id || 'new'}`,
        enabled: !isEditing,
        debounceMs: 500,
        version: 2,
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
                // No reviewers found to notify
                return
            }

            // Filter active users and exclude the author, get unique user IDs
            const uniqueReviewerIds = new Set<string>()
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

    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
    const previewRef = useRef<HTMLDivElement>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [aiLanguage, setAiLanguage] = useState('English')
    const [isForbidden, setIsForbidden] = useState(false)
    const [showDocumentPicker, setShowDocumentPicker] = useState(false)
    const [showMediaPicker, setShowMediaPicker] = useState(false)
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
            setIsForbidden(true)
            toast.error('You do not have permission to create or edit articles.')
            navigate('/knowledge/search')
        }
    }, [primaryRole, navigate])

    // Load Data Effect
    useEffect(() => {
        if (id && id !== 'new') {
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
                            storage_path: '',
                            content_type: data.content_type || 'document',
                            visibility: data.visibility || 'all_properties',
                            requires_acknowledgment: data.requires_acknowledgment || false,
                            featured: false,
                            department_id: data.department_id || null,
                            category_id: data.category_id || null,
                            target_property_id: data.property_id || null,
                            specific_department_ids: data.department_access_ids || [],
                            linked_training_id: data.linked_training_id || null,
                            // Content Type Specific
                            checklist_items: data.checklist_items || [],
                            faq_items: data.faq_items || [],
                            video_url: data.video_url || '',
                            images: data.images || [],
                            // AI Auto-tagging fields
                            ai_tags: data.ai_tags || [],
                            ai_category: data.ai_category || '',
                            ai_processed_at: data.ai_processed_at || '',
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

    const handleMediaSelect = useCallback((assets: MediaAsset[]) => {
        if (assets.length === 0) return
        const asset = assets[0]

        if (asset.media_type === 'image') {
            const imgHtml = `<p><img src="${asset.public_url}" alt="${asset.title || asset.filename}" class="rounded-xl shadow-md my-4 max-w-full" /></p>`
            updateField('content', (formData.content || '') + '\n' + imgHtml)
            toast.success(t('editor.media_inserted', 'Image inserted from media library'))
        } else if (asset.media_type === 'video') {
            updateField('video_url', asset.public_url)
            if (formData.content_type !== 'video') {
                updateField('content_type', 'video')
            }
            toast.success(t('editor.video_linked', 'Video linked from media library'))
        } else {
            updateField('file_url', asset.public_url)
            toast.success(t('editor.media_attached', 'Media asset attached to document'))
        }
        setShowMediaPicker(false)
    }, [formData.content, formData.content_type, t, updateField])

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

            const estimatedReadTime = calculateEstimatedReadTime(formData.content)
            let savedArticleId: string | null = null
            let savedArticleData = null
            let redirectToArticleId: string | null = null

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
                property_id: normalizedPropertyId,
                department_id: isUuid(formData.department_id) ? formData.department_id : null,
                category_id: isUuid(formData.category_id) ? formData.category_id : null,
                linked_training_id: isUuid(formData.linked_training_id) ? formData.linked_training_id : null,
                updated_by: user?.id,
                updated_at: new Date().toISOString(),
                estimated_read_time: estimatedReadTime,
                checklist_items: formData.checklist_items || [],
                faq_items: formData.faq_items || [],
                video_url: formData.video_url || null,
                images: formData.images || []
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
                if (status === 'PUBLISHED') {
                    await triggerService.onSOPPublished(id, formData.department_id || undefined)
                }

                const typeLabel = t(`content_types.${formData.content_type}`, { defaultValue: formData.content_type.toUpperCase() })
                toast.success(status === 'PENDING_REVIEW'
                    ? t('editor.alerts.submitted_for_review')
                    : t('editor.alerts.update_success', { type: typeLabel }))
            } else {
                const insertPayload = {
                    ...articleData,
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
                if (status === 'PUBLISHED') {
                    await triggerService.onSOPPublished(data.id, formData.department_id || undefined)
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
            setIsSaving(false)
        }
    }

    if (isForbidden || primaryRole === 'staff') {
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

            {/* Sticky Modern Top Navigation & Actions Bar */}
            <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t('accessibility.back', 'Go back')} className="rounded-full h-9 w-9">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                                {formData.title.trim() || (isEditing ? t('editor.edit_title') : t('editor.create_title'))}
                            </h1>
                            <Badge variant="outline" className="text-[10px] uppercase font-semibold capitalize tracking-wider bg-slate-50 dark:bg-slate-900">
                                {formData.content_type}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            {isEditing ? 'Editing Knowledge Document' : 'New Knowledge Base Article'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => saveArticle('DRAFT')} disabled={isSaving || isUploading} className="text-xs h-9">
                        {isSaving ? <Loader2 className="animate-spin h-3.5 w-3.5 me-1.5" /> : <Save className="h-3.5 w-3.5 me-1.5" />}
                        {t('editor.draft', 'Save Draft')}
                    </Button>

                    {/* Submit for Review (Dept Head, HR, Prop Manager) */}
                    {['department_head', 'property_hr', 'property_manager'].includes(primaryRole || '') && (
                        <Button
                            size="sm"
                            onClick={() => saveArticle('PENDING_REVIEW')}
                            disabled={isSaving || isUploading}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-9 font-semibold"
                        >
                            {isSaving ? <Loader2 className="animate-spin h-3.5 w-3.5 me-1.5" /> : <Clock className="h-3.5 w-3.5 me-1.5" />}
                            {t('editor.submit_for_review', 'Submit for Review')}
                        </Button>
                    )}

                    {/* Publish (Prop Manager, Admin only) */}
                    {['property_manager', 'regional_admin', 'corporate_admin', 'super_admin', 'admin'].includes(primaryRole || '') && (
                        <Button
                            size="sm"
                            onClick={() => saveArticle('PUBLISHED')}
                            disabled={isSaving || isUploading}
                            className="bg-hotel-gold hover:bg-hotel-gold-dark text-white text-xs h-9 font-bold shadow-sm"
                        >
                            {isSaving ? <Loader2 className="animate-spin h-3.5 w-3.5 me-1.5" /> : <Send className="h-3.5 w-3.5 me-1.5" />}
                            {t('editor.publish', 'Publish Article')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Main 2-Panel Authoring Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT CANVAS: Writing Studio & Core Content (8 cols) */}
                <div className="lg:col-span-8 space-y-5">
                    
                    {/* Article Hero Card: Title & Content Type Selector */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardContent className="pt-6 pb-5 space-y-4">
                            {/* Large Title Input */}
                            <div>
                                <Input
                                    value={formData.title}
                                    onChange={e => updateField('title', e.target.value)}
                                    placeholder={t('editor.title_placeholder', 'Article Title (e.g. Forbes 5-Star VIP Arrival Protocol)...')}
                                    className="text-2xl md:text-3xl font-bold border-none px-0 shadow-none focus-visible:ring-0 placeholder:text-slate-300 dark:placeholder:text-slate-600 tracking-tight"
                                />
                                <div className="h-px w-full bg-slate-100 dark:bg-slate-800 my-2" />
                            </div>

                            {/* Content Type Selector Pills */}
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Document Format
                                </Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {CONTENT_TYPE_CONFIG.map(cfg => {
                                        const isSelected = formData.content_type === cfg.type
                                        return (
                                            <button
                                                key={cfg.type}
                                                type="button"
                                                onClick={() => updateField('content_type', cfg.type)}
                                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 flex items-center gap-1.5 ${
                                                    isSelected
                                                        ? 'bg-hotel-navy text-white shadow-sm border border-hotel-navy'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 border border-transparent'
                                                }`}
                                            >
                                                <span>{cfg.icon || '📄'}</span>
                                                <span>{t(`content_types.${cfg.type}`, cfg.label)}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Subtitle / Tagline */}
                            <div className="pt-1">
                                <Input
                                    value={formData.description}
                                    onChange={e => updateField('description', e.target.value)}
                                    placeholder={t('editor.description_placeholder', 'Add a short subtitle or operational purpose (10-15 words)...')}
                                    className="text-xs text-slate-600 dark:text-slate-300 border-none px-0 shadow-none focus-visible:ring-0 placeholder:text-slate-400"
                                />
                            </div>

                            {/* Duplicate Detection Warning */}
                            {showDuplicateWarning && duplicateCheckResult?.hasDuplicates && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                                {t('editor.duplicate_warning', 'Similar articles already exist')}
                                            </p>
                                            <ul className="mt-1.5 space-y-1">
                                                {duplicateCheckResult.duplicates.slice(0, 2).map(dup => (
                                                    <li key={dup.id} className="text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between">
                                                        <span className="truncate flex-1">• {dup.title}</span>
                                                        <Badge variant="outline" className="ms-2 text-[10px]">{dup.similarity}% match</Badge>
                                                    </li>
                                                ))}
                                            </ul>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="mt-1.5 h-6 text-[11px] text-amber-700 hover:text-amber-900 px-2"
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
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs text-hotel-navy dark:text-hotel-gold hover:bg-slate-100 dark:hover:bg-slate-800"
                                        onClick={() => generateSuggestions(formData.title, formData.content, formData.description)}
                                    >
                                        <Sparkles className="w-3 h-3 me-1 text-hotel-gold" />
                                        {t('editor.suggest_tags', 'AI Suggest Tags')}
                                    </Button>
                                </div>
                            )}

                            {tagSuggestions.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    <span className="text-[11px] text-slate-400 font-medium">{t('editor.suggested_tags', 'Tags:')}</span>
                                    {tagSuggestions.map((suggestion) => (
                                        <Badge
                                            key={`${suggestion.tag}-${suggestion.confidence}`}
                                            variant="outline"
                                            className={`text-[10px] cursor-pointer hover:bg-hotel-gold/10 ${
                                                suggestion.confidence === 'high' ? 'border-green-300 text-green-700' : 'border-slate-300 text-slate-600'
                                            }`}
                                        >
                                            #{suggestion.tag}
                                        </Badge>
                                    ))}
                                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={clearSuggestions}>
                                        <X className="w-3 h-3 text-slate-400" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* AI Co-Authoring Ribbon */}
                    <div className="bg-gradient-to-r from-hotel-navy/5 via-hotel-gold/10 to-hotel-navy/5 border border-hotel-gold/25 rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-hotel-gold/20 flex items-center justify-center text-hotel-gold shrink-0">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                                AI Co-Writer:
                            </span>
                            <Select value={aiLanguage} onValueChange={setAiLanguage}>
                                <SelectTrigger className="w-[120px] h-7 text-xs bg-white dark:bg-slate-950 font-medium">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="English">English</SelectItem>
                                    <SelectItem value="Arabic">العربية</SelectItem>
                                    <SelectItem value="English and Arabic">Bilingual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateWithAI('outline')}
                                disabled={isGenerating}
                                className="h-7 text-xs bg-white dark:bg-slate-950 font-medium hover:bg-hotel-gold/10"
                            >
                                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin me-1" /> : <Wand2 className="h-3 w-3 text-hotel-gold me-1" />}
                                {t('editor.outline', 'Outline')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateWithAI('expand')}
                                disabled={isGenerating || !formData.content}
                                className="h-7 text-xs bg-white dark:bg-slate-950 font-medium hover:bg-hotel-gold/10"
                            >
                                <RefreshCw className="h-3 w-3 text-hotel-navy dark:text-hotel-gold me-1" />
                                {t('editor.expand', 'Deep Expand')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateWithAI('improve')}
                                disabled={isGenerating || !formData.content}
                                className="h-7 text-xs bg-white dark:bg-slate-950 font-medium hover:bg-hotel-gold/10"
                            >
                                <Sparkles className="h-3 w-3 text-amber-500 me-1" />
                                {t('editor.improve', 'Polish')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateWithAI('checklist')}
                                disabled={isGenerating}
                                className="h-7 text-xs bg-white dark:bg-slate-950 font-medium text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                            >
                                <CheckSquare className="h-3 w-3 text-orange-500 me-1" />
                                AI Checklist
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateWithAI('faqs')}
                                disabled={isGenerating}
                                className="h-7 text-xs bg-white dark:bg-slate-950 font-medium text-yellow-600 border-yellow-200 hover:bg-yellow-50 dark:hover:bg-yellow-950/40"
                            >
                                <HelpCircle className="h-3 w-3 text-yellow-500 me-1" />
                                AI FAQs
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateWithAI('summarize')}
                                disabled={isGenerating || !formData.content}
                                className="h-7 text-xs bg-white dark:bg-slate-950 font-medium hover:bg-hotel-gold/10"
                            >
                                <FileText className="h-3 w-3 text-blue-500 me-1" />
                                Summarize
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => beautifyArticle()}
                                disabled={isGenerating || !formData.content}
                                className="h-7 text-xs bg-white dark:bg-slate-950 font-medium text-purple-600 border-purple-200 hover:bg-purple-50"
                            >
                                <Palette className="h-3 w-3 text-purple-500 me-1" />
                                Beautify
                            </Button>
                        </div>
                    </div>

                    {/* Editor & Live Preview Studio */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
                                        <TabsList className="h-8">
                                            <TabsTrigger value="edit" className="text-xs h-7 px-3">
                                                ✍️ {t('editor.content_tab', 'Write')}
                                            </TabsTrigger>
                                            <TabsTrigger value="preview" className="text-xs h-7 px-3">
                                                👁️ {t('editor.preview_tab', 'Live Interactive Preview')}
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowMediaPicker(true)}
                                        className="h-8 text-xs gap-1.5 font-medium border-slate-200 dark:border-slate-800 hover:border-hotel-gold hover:bg-hotel-gold/5 text-slate-700 dark:text-slate-200"
                                    >
                                        <ImageIcon className="w-3.5 h-3.5 text-hotel-gold" />
                                        <span>Media Library</span>
                                    </Button>
                                </div>

                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span>{formData.content ? `${formData.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length} words` : '0 words'}</span>
                                    <span>•</span>
                                    <span>{calculateEstimatedReadTime(formData.content) || 1} min read</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {activeTab === 'edit' ? (
                                <div className="space-y-6">
                                    <RichTextEditor
                                        value={formData.content}
                                        onChange={v => updateField('content', v)}
                                        placeholder={t('editor.write_placeholder', 'Start typing the hotel operational procedure or policy standard here...')}
                                        minHeight={320}
                                        direction={aiLanguage === 'Arabic' ? 'rtl' : 'ltr'}
                                    />

                                    {/* Interactive Execution Checklist Builder */}
                                    <div className="pt-2">
                                        <ChecklistBuilder
                                            items={formData.checklist_items || []}
                                            onChange={items => updateField('checklist_items', items)}
                                            onAIGenerate={() => generateWithAI('checklist')}
                                            isGenerating={isGenerating}
                                            title={formData.title}
                                        />
                                    </div>

                                    {/* Operational FAQs & Edge Cases Builder */}
                                    <div className="pt-2">
                                        <FAQBuilder
                                            items={formData.faq_items || []}
                                            onChange={items => updateField('faq_items', items)}
                                            onAIGenerate={() => generateWithAI('faqs')}
                                            isGenerating={isGenerating}
                                            title={formData.title}
                                        />
                                    </div>

                                    {/* Video Content Block (if video format or video url exists) */}
                                    {(formData.content_type === 'video' || formData.video_url) && (
                                        <div className="pt-2">
                                            <VideoContentBuilder
                                                value={formData.video_url}
                                                onChange={v => updateField('video_url', v)}
                                            />
                                        </div>
                                    )}

                                    {/* Visual Image Gallery Block (if visual format or images exist) */}
                                    {(formData.content_type === 'visual' || (formData.images && formData.images.length > 0)) && (
                                        <div className="pt-2">
                                            <VisualContentBuilder
                                                images={formData.images}
                                                onChange={v => updateField('images', v)}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div ref={previewRef} className="space-y-8 min-h-[400px] p-6 border rounded-xl bg-white dark:bg-slate-950">
                                    {/* Standard Article HTML Preview */}
                                    {previewHtml ? (
                                        <InlineErrorBoundary>
                                            <div
                                                className="prose max-w-none text-slate-800 dark:text-slate-100"
                                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }}
                                            />
                                        </InlineErrorBoundary>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic py-8 text-center">
                                            {t('editor.preview_empty', 'No article body content yet. Start writing on the Write tab.')}
                                        </p>
                                    )}

                                    {/* Live Video Preview */}
                                    {formData.video_url && (
                                        <div className="pt-6 border-t">
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                                                <VideoIcon className="w-4 h-4 text-red-500" />
                                                Video Demonstration
                                            </h4>
                                            <VideoPlayer videoUrl={formData.video_url} title={formData.title} />
                                        </div>
                                    )}

                                    {/* Live Interactive Checklist Preview */}
                                    {formData.checklist_items && formData.checklist_items.length > 0 && (
                                        <div className="pt-6 border-t">
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                                                <CheckSquare className="w-4 h-4 text-orange-500" />
                                                Interactive SOP Execution Checklist
                                            </h4>
                                            <ChecklistRenderer items={formData.checklist_items} />
                                        </div>
                                    )}

                                    {/* Live Interactive FAQ Accordion Preview */}
                                    {formData.faq_items && formData.faq_items.length > 0 && (
                                        <div className="pt-6 border-t">
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                                                <HelpCircle className="w-4 h-4 text-yellow-500" />
                                                Operational FAQs & Edge Cases
                                            </h4>
                                            <FAQAccordion items={formData.faq_items} />
                                        </div>
                                    )}

                                    {/* Live Image Gallery Preview */}
                                    {formData.images && formData.images.length > 0 && (
                                        <div className="pt-6 border-t">
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                                                <ImageIcon className="w-4 h-4 text-blue-500" />
                                                Step-by-Step Visual Gallery
                                            </h4>
                                            <ImageGalleryRenderer images={formData.images} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

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

                {/* RIGHT INSPECTOR: Settings, Organization & Attachments (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                    
                    {/* 1. Department & Classification */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <List className="h-4 w-4 text-hotel-gold" />
                                <span>{t('editor.topic_and_categorization', 'Topic & Classification')}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3.5">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                                    {t('editor.main_team_topic', 'Department / Team')} <span className="text-red-500">*</span>
                                </Label>
                                <GroupedDepartmentSelector
                                    departments={departments}
                                    properties={properties}
                                    value={formData.department_id || 'none'}
                                    onValueChange={v => {
                                        updateField('department_id', v === 'none' ? null : v)
                                        updateField('category_id', null)
                                    }}
                                    placeholder={t('editor.select_department', 'Select main team...')}
                                    generalLabel={t('editor.general_department')}
                                    className="w-full text-xs"
                                />
                            </div>

                            {formData.department_id && (
                                <div className="pt-2 border-t border-dashed">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                                        {t('editor.category_optional', 'Sub-Category (Optional)')}
                                    </Label>
                                    <Select value={formData.category_id || 'none'} onValueChange={v => updateField('category_id', v === 'none' ? null : v)}>
                                        <SelectTrigger className="w-full text-xs bg-white dark:bg-slate-950">
                                            <SelectValue placeholder={t('editor.category_optional', 'Sub-Category (Optional)')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">{t('editor.general_category', 'General Topic')}</SelectItem>
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
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-hotel-gold" />
                                <span>{t('editor.who_can_view', 'Audience & Access')}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                                    {t('editor.viewer_group', 'Viewer Scope')}
                                </Label>
                                <Select value={formData.visibility} onValueChange={v => updateField('visibility', v as KnowledgeVisibility)}>
                                    <SelectTrigger className="w-full text-xs bg-white dark:bg-slate-950">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {VISIBILITY_OPTIONS.map(o => (
                                            <SelectItem key={o.value} value={o.value}>
                                                <div className="flex flex-col py-0.5">
                                                    <span className="font-semibold text-xs">{o.label}</span>
                                                    <span className="text-[10px] text-muted-foreground">{o.description}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {formData.visibility === 'specific_departments' && (
                                    <div className="mt-2.5">
                                        <Label className="text-xs font-semibold mb-1 block">
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

                                {user && (formData.visibility === 'property' || formData.visibility === 'department') && (
                                    <div className="mt-2.5">
                                        <Label className="text-xs font-semibold mb-1 block">{t('editor.which_hotel', 'Hotel Property')}</Label>
                                        <Select
                                            value={formData.target_property_id || 'current'}
                                            onValueChange={v => updateField('target_property_id', v === 'current' ? null : v)}
                                        >
                                            <SelectTrigger className="w-full text-xs bg-white dark:bg-slate-950">
                                                <Building2 className="me-1.5 h-3.5 w-3.5 opacity-50" />
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="current">
                                                    Current Hotel ({currentProperty?.name || 'Head Office'})
                                                </SelectItem>
                                                {properties?.filter(p => p.id !== currentProperty?.id && p.id !== 'all').map(prop => (
                                                    <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="mt-2 p-2 rounded bg-slate-50 dark:bg-slate-900 border text-[11px] text-slate-600 dark:text-slate-400">
                                    {visibilitySummary}
                                </div>
                            </div>

                            <div className="pt-2 border-t flex items-center justify-between">
                                <Label className="text-xs font-medium cursor-pointer" htmlFor="ack-switch">
                                    {t('editor.require_read_confirmation', 'Mandatory Read Confirmation')}
                                </Label>
                                <Switch
                                    id="ack-switch"
                                    checked={formData.requires_acknowledgment}
                                    onCheckedChange={v => updateField('requires_acknowledgment', v)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Executive Summary (TL;DR) */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-hotel-gold" />
                                    <span>Executive TL;DR</span>
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => generateWithAI('summarize')}
                                    disabled={isGenerating || !formData.content}
                                    className="h-6 text-[11px] text-hotel-navy dark:text-hotel-gold hover:bg-hotel-gold/10 px-2"
                                >
                                    <Sparkles className="w-3 h-3 me-1 text-hotel-gold" />
                                    AI Auto-Fill
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Textarea
                                value={formData.summary}
                                onChange={e => updateField('summary', e.target.value)}
                                placeholder={t('editor.summary_placeholder', '2-3 sentence overview of what this document covers and who must follow it...')}
                                rows={3}
                                maxLength={300}
                                className="text-xs bg-white dark:bg-slate-950"
                            />
                            <p className="text-[10px] text-muted-foreground text-right">
                                {formData.summary.length}/300
                            </p>
                        </CardContent>
                    </Card>

                    {/* 4. PDF Attachment & Media Library */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-hotel-gold" />
                                <span>Attached Document & Media</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowDocumentPicker(true)}
                                    className="text-xs h-8 font-medium gap-1.5"
                                >
                                    <FolderOpen className="h-3.5 w-3.5 text-hotel-gold" />
                                    Doc Library
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowMediaPicker(true)}
                                    className="text-xs h-8 font-medium gap-1.5"
                                >
                                    <ImageIcon className="h-3.5 w-3.5 text-hotel-gold" />
                                    Media Library
                                </Button>
                            </div>
                            {formData.file_url && (
                                <div className="flex items-center justify-between p-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 text-xs">
                                    <span className="truncate text-green-800 dark:text-green-300 font-medium">
                                        📎 {formData.file_url.split('/').pop()}
                                    </span>
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] px-2 shrink-0">
                                        Linked
                                    </Badge>
                                </div>
                            )}

                            <div className="pt-2 border-t border-dashed">
                                <Label className="text-xs font-semibold mb-1.5 block">Upload PDF</Label>
                                <Input
                                    type="file"
                                    accept=".pdf"
                                    disabled={isUploading}
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
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
                                    }}
                                    className="text-xs cursor-pointer h-8 file:text-xs"
                                />
                            </div>

                            {/* External Web Link */}
                            <div className="pt-2 border-t border-dashed">
                                <Label className="text-xs font-semibold mb-1 block">External Link</Label>
                                <Input
                                    value={formData.file_url}
                                    onChange={e => updateField('file_url', e.target.value)}
                                    placeholder="https://..."
                                    className="text-xs h-8 bg-white dark:bg-slate-950"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 5. Linked Training Course */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <LinkIcon className="h-4 w-4 text-hotel-gold" />
                                <span>{t('editor.linked_training', 'Linked Training Course')}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Select
                                value={formData.linked_training_id || 'none'}
                                onValueChange={v => updateField('linked_training_id', v === 'none' ? null : v)}
                            >
                                <SelectTrigger className="w-full text-xs bg-white dark:bg-slate-950">
                                    <SelectValue placeholder={t('editor.select_training_module', 'Select course...')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t('editor.no_linked_training', 'None (No course linked)')}</SelectItem>
                                    {trainingModules?.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground mt-1.5">
                                When associates read this SOP, they will be prompted to take the training module.
                            </p>
                        </CardContent>
                    </Card>
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
                onOpenChange={setShowMediaPicker}
                onSelect={handleMediaSelect}
                title="Select Media from Hotel Library"
            />
        </div>
    )
}
