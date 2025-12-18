import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { EnhancedBadge } from '@/components/ui/enhanced-badge'
import { EnhancedCard } from '@/components/ui/enhanced-card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { CardLoading } from '@/components/common/LoadingStates'
import emptyBoxAnimation from '@/assets/lottie/empty-box.json'
import {
    Briefcase,
    Plus,
    MapPin,
    Building2,
    Calendar,
    DollarSign,
    Eye,
    Edit,
    Trash2,
    Search
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { JobPosting } from '@/lib/types'
import { DeleteConfirmation } from '@/components/shared/DeleteConfirmation'
import { useTranslation } from 'react-i18next'
import { crudToasts } from '@/lib/toastHelpers'



export default function JobPostings({ embedded = false }: { embedded?: boolean }) {
    const { roles } = useAuth()
    const { t } = useTranslation('jobs')
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [deleteJob, setDeleteJob] = useState<JobPosting | null>(null)

    const canManageJobs = (roles || []).some((userRole) =>
        ['regional_admin', 'regional_hr', 'property_hr', 'property_manager'].includes(userRole.role)
    )

    const { data: jobs, isLoading } = useQuery({
        queryKey: ['job-postings', statusFilter],
        queryFn: async () => {
            let query = supabase
                .from('job_postings')
                .select(`
          *,
          property:properties(id, name),
          department:departments(id, name),
          created_by_profile:profiles!job_postings_created_by_fkey(id, full_name)
        `)
                .order('created_at', { ascending: false })
                .eq('is_deleted', false)

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter)
            }

            const { data, error } = await query
            if (error) throw error
            return data as JobPosting[]
        }
    })

    const deleteJobMutation = useMutation({
        mutationFn: async (jobId: string) => {
            const { error } = await supabase
                .from('job_postings')
                .update({ is_deleted: true })
                .eq('id', jobId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-postings'] })
            setDeleteJob(null)
            crudToasts.delete.success('Job posting')
        },
        onError: () => {
            crudToasts.delete.error('job posting')
        }
    })

    const updateStatusMutation = useMutation({
        mutationFn: async ({ jobId, status }: { jobId: string, status: string }) => {
            const updates: any = { status }

            if (status === 'open' && !jobs?.find(j => j.id === jobId)?.published_at) {
                updates.published_at = new Date().toISOString()
            }

            const { error } = await supabase
                .from('job_postings')
                .update(updates)
                .eq('id', jobId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-postings'] })
        }
    })

    const filteredJobs = jobs?.filter(job =>
        job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.property?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.department?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (isLoading) {
        return (
            <div className="space-y-6">
                <PageHeader title={t('title')} description={t('description')} />
                <CardLoading count={3} />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {!embedded && (
                <PageHeader
                    title={t('title')}
                    description={t('description')}
                    actions={
                        canManageJobs ? (
                            <Link to="/jobs/new">
                                <Button className="bg-hotel-navy hover:bg-hotel-navy-light">
                                    <Plus className="h-4 w-4 me-2" />
                                    {t('create')}
                                </Button>
                            </Link>
                        ) : null
                    }
                />
            )}

            {/* Filters */}
            <div className="prime-card">
                <div className="prime-card-body p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <div className="flex-1">
                            <Input
                                type="text"
                                placeholder={t('search_placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-11"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[150px] h-11">
                                <SelectValue placeholder={t('filters.status')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('allStatus')}</SelectItem>
                                <SelectItem value="draft">{t('status.draft')}</SelectItem>
                                <SelectItem value="open">{t('status.open')}</SelectItem>
                                <SelectItem value="closed">{t('status.closed')}</SelectItem>
                                <SelectItem value="filled">{t('status.filled')}</SelectItem>
                                <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Job Listings */}
            <div className="space-y-4">
                {filteredJobs?.length === 0 && jobs?.length === 0 && (
                    <EmptyState
                        animationData={emptyBoxAnimation}
                        icon={Briefcase}
                        title={t('noJobsFound')}
                        description={t('createFirst')}
                        action={canManageJobs ? {
                            label: t('create'),
                            onClick: () => window.location.href = '/jobs/new',
                            icon: Plus
                        } : undefined}
                    />
                )}
                {filteredJobs?.length === 0 && jobs && jobs.length > 0 && (
                    <EmptyState
                        animationData={emptyBoxAnimation}
                        icon={Search}
                        title={t('noJobsFound')}
                        description={t('tryAdjusting')}
                        action={{
                            label: t('filters.clear'),
                            onClick: () => {
                                setSearchTerm('')
                                setSearchTerm('')
                                setStatusFilter('all')
                            }
                        }}
                    />
                )}
                {filteredJobs?.map((job, index) => (
                    <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <EnhancedCard variant="default" className="hover:shadow-lg hover:border-hotel-navy/20 transition-all duration-300">
                            <div className="p-3 sm:p-4">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                                    <div className="p-2.5 sm:p-3 bg-hotel-navy/5 rounded-lg border border-hotel-navy/10 self-start">
                                        <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-hotel-navy" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-start gap-2 mb-2">
                                            <h3 className="text-base sm:text-lg font-semibold text-hotel-navy">{job.title}</h3>
                                            <div className="flex flex-wrap gap-1">
                                                <EnhancedBadge variant={job.status === 'open' ? 'success' : job.status === 'filled' ? 'navy' : 'secondary'} className="text-xs">
                                                    {t(`status.${job.status}`)}
                                                </EnhancedBadge>
                                                <EnhancedBadge variant="gold" dot className="text-xs">
                                                    {t(`seniority.${job.seniority_level}`)}
                                                </EnhancedBadge>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-600">
                                            {job.property && (
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="h-3.5 w-3.5 text-hotel-gold" />
                                                    {job.property.name}
                                                </span>
                                            )}
                                            {job.department && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5 text-hotel-gold" />
                                                    {job.department.name}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5 text-hotel-gold" />
                                                {formatRelativeTime(job.created_at)}
                                            </span>
                                        </div>

                                        {job.description && (
                                            <p className="text-xs sm:text-sm text-gray-600 mt-2 line-clamp-2">
                                                {job.description}
                                            </p>
                                        )}

                                        {(job.salary_range_min || job.salary_range_max) && (
                                            <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-gray-700">
                                                <DollarSign className="h-3.5 w-3.5" />
                                                {job.salary_range_min && job.salary_range_max
                                                    ? `$${job.salary_range_min.toLocaleString()} - $${job.salary_range_max.toLocaleString()}`
                                                    : job.salary_range_min
                                                        ? `${t('from')} $${job.salary_range_min.toLocaleString()}`
                                                        : `${t('upTo')} $${job.salary_range_max?.toLocaleString()}`
                                                }
                                            </div>
                                        )}

                                        <div className="flex flex-wrap items-center gap-2 mt-3">
                                            <Link to={`/jobs/${job.id}`}>
                                                <Button size="sm" variant="outline" className="h-9 text-xs sm:text-sm">
                                                    <Eye className="h-3.5 w-3.5 me-1.5" />
                                                    {t('viewDetails')}
                                                </Button>
                                            </Link>

                                            {canManageJobs && (
                                                <>
                                                    <Link to={`/jobs/${job.id}/edit`}>
                                                        <Button size="sm" variant="outline" className="h-9 text-xs sm:text-sm">
                                                            <Edit className="h-3.5 w-3.5 me-1.5" />
                                                            {t('edit')}
                                                        </Button>
                                                    </Link>

                                                    {job.status === 'draft' && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 text-white h-9 text-xs sm:text-sm"
                                                            onClick={() => updateStatusMutation.mutate({ jobId: job.id, status: 'open' })}
                                                        >
                                                            {t('publish')}
                                                        </Button>
                                                    )}

                                                    {job.status === 'open' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-9 text-xs sm:text-sm"
                                                            onClick={() => updateStatusMutation.mutate({ jobId: job.id, status: 'closed' })}
                                                        >
                                                            {t('close')}
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600 hover:text-red-700 h-9"
                                                        onClick={() => setDeleteJob(job)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </EnhancedCard>
                    </motion.div>
                ))}

                {filteredJobs?.length === 0 && (
                    <EmptyState
                        animationData={emptyBoxAnimation}
                        icon={Briefcase}
                        title={t('noJobsFound')}
                        description={searchTerm ? t('tryAdjusting') : t('createFirst')}
                        action={canManageJobs && !searchTerm ? {
                            label: t('create'),
                            onClick: () => window.location.href = '/jobs/new',
                            icon: Plus
                        } : undefined}
                    />
                )}
            </div>

            {/* Delete Confirmation */}
            {
                deleteJob && (
                    <DeleteConfirmation
                        open={!!deleteJob}
                        onOpenChange={(open) => !open && setDeleteJob(null)}
                        onConfirm={() => deleteJob && deleteJobMutation.mutate(deleteJob.id)}
                        itemName={deleteJob.title}
                        itemType={t('jobPosting')}
                    />
                )
            }
        </div >
    )
}
