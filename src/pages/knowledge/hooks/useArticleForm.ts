import { useState, useCallback, useMemo } from 'react'
import { type KnowledgeVisibility, type ChecklistItem, type FAQItem } from '@/types/knowledge'
import { useTranslation } from 'react-i18next'
import { useProperty } from '@/contexts/PropertyContext'
import { useProperties } from '@/hooks/useProperties'
import { useDepartments } from '@/hooks/useDepartments'

export interface ArticleFormData {
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
    // Content Type Specific
    checklist_items: ChecklistItem[]
    faq_items: FAQItem[]
    video_url: string
    images: any[]
}

export const isUuid = (value?: string | null): value is string => {
    if (!value) return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function useArticleForm(initialData?: Partial<ArticleFormData>) {
    const { t } = useTranslation(['knowledge', 'common'])
    const { currentProperty } = useProperty()
    const { departments } = useDepartments(currentProperty?.id)
    const { data: properties } = useProperties()

    const [formData, setFormData] = useState<ArticleFormData>({
        title: '',
        description: '',
        summary: '',
        content: '',
        file_url: '',
        storage_path: '',
        content_type: 'document',
        visibility: 'all_properties' as KnowledgeVisibility,
        requires_acknowledgment: false,
        featured: false,
        department_id: null,
        category_id: null,
        target_property_id: null,
        specific_department_ids: [],
        checklist_items: [],
        faq_items: [],
        video_url: '',
        images: [],
        ...initialData
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
                if (value === null && (updated.visibility === 'department' || updated.visibility === 'group_department')) {
                    updated.visibility = 'all_properties' as KnowledgeVisibility
                }
            }

            return updated
        })
    }, [])

    // Computed validation warnings
    const validationWarnings = useMemo(() => ({
        departmentRequired: (formData.visibility === 'department' || formData.visibility === 'group_department') && !formData.department_id,
        propertyIrrelevant: (formData.visibility === 'all_properties' || formData.visibility === 'group_department') && formData.target_property_id,
    }), [formData.visibility, formData.department_id, formData.target_property_id])

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

    // Extract unique department names for group selection
    const uniqueDepartmentNames = useMemo(() => {
        if (!departments) return []
        return Array.from(new Set(departments.map(d => d.name))).sort()
    }, [departments])

    return {
        formData,
        setFormData,
        updateField,
        validationWarnings,
        visibilitySummary,
        uniqueDepartmentNames,
        departments,
        properties
    }
}
