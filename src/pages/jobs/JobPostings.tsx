import emptyBoxAnimation from '@/assets/lottie/empty-box.json'
import { CardLoading } from '@/components/common/LoadingStates'
import { PageHeader } from '@/components/layout/PageHeader'
import { DeleteConfirmation } from '@/components/shared/DeleteConfirmation'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { crudToasts } from '@/lib/toastHelpers'
import type { JobPosting } from '@/lib/types'
import { formatRelativeTime } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import {
    Briefcase,
    Building2,
    Calendar,
    DollarSign,
    Edit,
    Eye,
    MapPin,
    Plus,
    Search,
    Trash2,
    Users
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import type { Database } from '@/types/database.generated'

type EntityStatus = Database['public']['Enums']['entity_status']

export default function JobPostings({ embedded = false }: { embedded?: boolean }) {
    const navigate = useNavigate()
    const { roles } = useAuth()
    const { t } = useTranslation('jobs')
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [deleteJob, setDeleteJob] = useState<JobPosting | null>(null)

    const canManageJobs = (roles || []).some((userRole) =>
        ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr', 'property_manager'].includes(userRole.role)
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
                query = query.eq('status', statusFilter as EntityStatus)
            }

            const { data, error } = await query
            if (error) throw error
            return (data || []) as unknown as JobPosting[]
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
        mutationFn: async ({ jobId, status }: { jobId: string, status: EntityStatus }) => {
            const updates: Database['public']['Tables']['job_postings']['Update'] = { status }

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
        <LazyMotion features={domAnimation}>
            <div className="space-y-6">
            {!embedded && (
                <PageHeader
                    title={t('title')}
                    description={t('description')}
                    actions={
                        <div className="flex gap-2">
                            <Link to="/jobs/referrals">
                                <Button variant="outline">
                                    <Users className="h-4 w-4 me-2" />
                                    {t('referrals.my_referrals', { defaultValue: 'My Referrals' })}
                                </Button>
                            </Link>
                            {canManageJobs && (
                                <Link to="/jobs/new">
                                    <Button className="bg-hotel-navy hover:bg-hotel-navy-light">
                                        <Plus className="h-4 w-4 me-2" />
                                        {t('create')}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    }
                />
            )}

            {/* Filters */}
            <div className="altus-card">
                <div className="altus-card-body p-3 sm:p-4">
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
                            onClick: () => navigate('/jobs/new'),
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
                                setStatusFilter('all')
                            }
                        }}
                    />
                )}
                {filteredJobs?.map((job, index) => (
                    <m.div
                        key={job.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <Card variant="default" className="hover:shadow-lg hover:border-hotel-navy/20 transition-all duration-300">
                            <div className="p-3 sm:p-4">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                                    <div className="p-2.5 sm:p-3 bg-hotel-navy/5 rounded-lg border border-hotel-navy/10 self-start">
                                        <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-hotel-navy" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-start gap-2 mb-2">
                                            <h3 className="text-base sm:text-lg font-semibold text-hotel-navy">{job.title}</h3>
                                            <div className="flex flex-wrap gap-1">
                                                <Badge variant={job.status === 'open' ? 'success' : job.status === 'filled' ? 'navy' : 'secondary'} className="text-xs">
                                                    {t(`status.${job.status}`)}
                                                </Badge>
                                                <Badge variant="gold" dot className="text-xs">
                                                    {t(`seniority.${job.seniority_level}`)}
                                                </Badge>
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
                        </Card>
                    </m.div>
                ))}

                {filteredJobs?.length === 0 && (
                    <EmptyState
                        animationData={emptyBoxAnimation}
                        icon={Briefcase}
                        title={t('noJobsFound')}
                        description={searchTerm ? t('tryAdjusting') : t('createFirst')}
                        action={canManageJobs && !searchTerm ? {
                            label: t('create'),
                            onClick: () => navigate('/jobs/new'),
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
            </div>
        </LazyMotion>
    )
}
