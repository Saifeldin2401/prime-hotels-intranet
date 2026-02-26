import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { triggerService } from '@/services/triggerService'
import * as KnowledgeService from '@/services/knowledgeService'
import { createBulkNotifications } from '@/lib/notificationService'
import { aiService } from '@/lib/gemini'
import { extractTextFromAiResponse } from '@/lib/aiResponse'
import { useTranslation } from 'react-i18next'
import { ArticleFormData, isUuid } from './useArticleForm'
import { scanFile } from '@/hooks/useVirusScan'

export function useArticlePersistence(
    formData: ArticleFormData,
    updateField: <K extends keyof ArticleFormData>(field: K, value: ArticleFormData[K]) => void,
    setFormData: React.Dispatch<React.SetStateAction<ArticleFormData>>,
    id?: string
) {
    const { t } = useTranslation(['knowledge', 'common'])
    const navigate = useNavigate()
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const queryClient = useQueryClient()
    const isEditing = Boolean(id) && id !== 'new'

    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    // Helper function to notify reviewers
    const notifyReviewersOfSubmission = async (documentId: string, documentTitle: string) => {
        try {
            const reviewerRoles = ['property_manager', 'regional_admin', 'regional_hr']
            const { data: reviewerRolesData, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, profiles!inner(id, full_name, is_active)')
                .in('role', reviewerRoles)

            if (rolesError) {
                console.error('Error fetching reviewer roles:', rolesError)
                return
            }

            if (!reviewerRolesData || reviewerRolesData.length === 0) return

            const uniqueReviewerIds = new Set<string>()
            const reviewers: { id: string; full_name: string }[] = []

            for (const item of reviewerRolesData) {
                const profile = (item as any).profiles
                if (profile?.is_active && profile.id !== user?.id && !uniqueReviewerIds.has(profile.id)) {
                    uniqueReviewerIds.add(profile.id)
                    reviewers.push({ id: profile.id, full_name: profile.full_name })
                }
            }

            if (reviewers.length === 0) return

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
            }
        } catch (error) {
            console.error('Failed to notify reviewers:', error)
        }
    }

    const calculateEstimatedReadTime = (value: string): number | null => {
        if (!value) return null
        const plainText = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        if (!plainText) return null
        return Math.max(1, Math.round(plainText.split(' ').length / 200))
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

        // Auto-summarization logic
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
                                .replace(/[^\x00-\x7F]/g, '')
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
            let savedArticleData: any = null
            let redirectToArticleId: string | null = null

            const articleData = {
                title: formData.title,
                description: finalDescription || null,
                summary: finalSummary || null,
                content: formData.content || null,
                file_url: formData.file_url || null,
                storage_bucket: 'documents',
                storage_path: formData.storage_path || null,
                content_type: formData.content_type,
                visibility: formData.visibility,
                requires_acknowledgment: formData.requires_acknowledgment,
                status: status,
                property_id: normalizedPropertyId,
                department_id: isUuid(formData.department_id) ? formData.department_id : null,
                category_id: isUuid(formData.category_id) ? formData.category_id : null,
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
                redirectToArticleId = data.id
            }

            // Invalidate queries
             let syncedArticleData: any = savedArticleData
            if (savedArticleId) {
                const hydratedArticle = await KnowledgeService.getArticleById(savedArticleId, user?.id)
                if (hydratedArticle) {
                    syncedArticleData = hydratedArticle
                }
            }

            const mergeArticleIntoCollection = (existing: any) => {
                if (!savedArticleId || !syncedArticleData || !existing) return existing

                if (Array.isArray(existing)) {
                    return existing.map((item: any) =>
                        item?.id === savedArticleId ? { ...item, ...syncedArticleData } : item
                    )
                }

                if (Array.isArray(existing.articles)) {
                    return {
                        ...existing,
                        articles: existing.articles.map((item: any) =>
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
                    (existing: any) => existing ? { ...existing, ...syncedArticleData } : syncedArticleData
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

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] }),
                queryClient.invalidateQueries({ queryKey: ['knowledge-department-counts-global'] }),
                queryClient.invalidateQueries({ queryKey: ['knowledge-type-counts'] }),
                queryClient.invalidateQueries({ queryKey: ['knowledge-featured'] }),
                queryClient.invalidateQueries({ queryKey: ['knowledge-recent'] }),
                savedArticleId
                    ? queryClient.invalidateQueries({ queryKey: ['knowledge-article', savedArticleId] })
                    : Promise.resolve(),
                savedArticleId
                    ? queryClient.invalidateQueries({ queryKey: ['knowledge-related', savedArticleId] })
                    : Promise.resolve(),
            ])

             await Promise.all([
                queryClient.refetchQueries({
                    queryKey: ['knowledge-articles'],
                    type: 'all'
                }),
                queryClient.refetchQueries({
                    queryKey: ['knowledge-featured'],
                    type: 'all'
                }),
                queryClient.refetchQueries({
                    queryKey: ['knowledge-recent'],
                    type: 'all'
                }),
                savedArticleId
                    ? queryClient.refetchQueries({
                        queryKey: ['knowledge-article', savedArticleId],
                        type: 'all'
                    })
                    : Promise.resolve(),
            ])

            if (redirectToArticleId) {
                navigate(`/knowledge/${redirectToArticleId}`)
            }
        } catch (error: any) {
            console.error('Error in saveArticle:', error)
            const errorMessage = error.message || (typeof error === 'string' ? error : JSON.stringify(error))
            toast.error(t('editor.alerts.save_error', { error: errorMessage }))
        } finally {
            setIsSaving(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
            const scanResult = await scanFile(file, {
                bucket: 'documents',
                context: 'knowledge_editor_upload'
            })
            if (!scanResult.safe) {
                throw new Error(scanResult.message || 'File failed security scan')
            }

            const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
            const { error } = await supabase.storage
                .from('documents')
                .upload(fileName, file)

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(fileName)

            updateField('file_url', publicUrl)
            updateField('storage_path', fileName)
            toast.success(t('editor.alerts.upload_success'))

            if (!formData.title) {
                updateField('title', file.name.replace('.pdf', ''))
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown upload error'
            console.error('Upload error:', error)
            toast.error(t('editor.alerts.upload_error') + errorMessage)
        } finally {
            setIsUploading(false)
        }
    }

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
                        setFormData(prev => ({
                            ...prev,
                            title: data.title || '',
                            description: data.description || '',
                            summary: data.summary || '',
                            content: data.content || '',
                            file_url: data.file_url || '',
                            storage_path: data.storage_path || '',
                            content_type: data.content_type || 'document',
                            visibility: data.visibility || 'all_properties',
                            requires_acknowledgment: data.requires_acknowledgment || false,
                            featured: false,
                            department_id: data.department_id || null,
                            category_id: data.category_id || null,
                            target_property_id: data.property_id || null,
                            specific_department_ids: data.department_access_ids || [],
                            checklist_items: data.checklist_items || [],
                            faq_items: data.faq_items || [],
                            video_url: data.video_url || '',
                            images: data.images || []
                        }))
                    }
                })
        }
    }, [id, setFormData])


    return {
        isSaving,
        isUploading,
        saveArticle,
        handleFileUpload
    }
}
