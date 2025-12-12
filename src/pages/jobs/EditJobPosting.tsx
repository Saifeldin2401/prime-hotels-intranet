import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { JobPostingForm } from '@/components/jobs/JobPostingForm'
import type { JobPosting } from '@/lib/types'
import { useTranslation } from 'react-i18next'

export default function EditJobPosting() {
    const { t } = useTranslation('jobs')
    const { id } = useParams<{ id: string }>()

    const { data: job, isLoading } = useQuery({
        queryKey: ['job-posting', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('job_postings')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            return data as JobPosting
        },
        enabled: !!id
    })

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
            </div>
        )
    }

    if (!job) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900">{t('messages.not_found_title')}</h2>
                <p className="text-gray-600 mt-2">{t('messages.not_found_desc')}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('form.edit_title')}
                description={`${t('form.edit_title')}: ${job.title}`}
            />

            <JobPostingForm job={job} />
        </div>
    )
}
