import { PageHeader } from '@/components/layout/PageHeader'
import { JobPostingForm } from '@/components/jobs/JobPostingForm'
import { useTranslation } from 'react-i18next'

export default function CreateJobPosting() {
    const { t } = useTranslation('jobs')

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('form.create_title')}
                description={t('form.create_title')}
            />

            <JobPostingForm />
        </div>
    )
}
