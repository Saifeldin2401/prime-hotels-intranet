import { useState } from 'react'
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
import {
    Briefcase,
    Plus,
    MapPin,
    Building2,
    Calendar,
    DollarSign,
    Eye,
    Edit,
    Trash2
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { JobPosting } from '@/lib/types'
import { DeleteConfirmation } from '@/components/shared/DeleteConfirmation'
import { useTranslation } from 'react-i18next'



export default function JobPostings() {
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
                .delete()
                .eq('id', jobId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-postings'] })
            setDeleteJob(null)
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
                <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="grid gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
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

            {/* Filters */}
            <div className="prime-card">
                <div className="prime-card-body">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <Input
                                type="text"
                                placeholder={t('search_placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px]">
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
                {filteredJobs?.map((job) => (
                    <EnhancedCard key={job.id} variant="default" className="hover:shadow-lg hover:border-hotel-navy/20 transition-all duration-300">
                        <div className="flex items-start justify-between p-1">
                            <div className="flex items-start gap-4 flex-1">
                                <div className="p-3 bg-hotel-navy/5 rounded-lg border border-hotel-navy/10">
                                    <Briefcase className="h-6 w-6 text-hotel-navy" />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-hotel-navy">{job.title}</h3>
                                            <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                                                {job.property && (
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="h-4 w-4 text-hotel-gold" />
                                                        {job.property.name}
                                                    </span>
                                                )}
                                                {job.department && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-4 w-4 text-hotel-gold" />
                                                        {job.department.name}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4 text-hotel-gold" />
                                                    {formatRelativeTime(job.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <EnhancedBadge variant={job.status === 'open' ? 'success' : job.status === 'filled' ? 'navy' : 'secondary'}>
                                                {t(`status.${job.status}`)}
                                            </EnhancedBadge>
                                            <EnhancedBadge variant="gold" dot>
                                                {t(`seniority.${job.seniority_level}`)}
                                            </EnhancedBadge>
                                        </div>
                                    </div>

                                    {job.description && (
                                        <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                                            {job.description}
                                        </p>
                                    )}

                                    {(job.salary_range_min || job.salary_range_max) && (
                                        <div className="flex items-center gap-2 mt-3 text-sm text-gray-700">
                                            <DollarSign className="h-4 w-4" />
                                            {job.salary_range_min && job.salary_range_max
                                                ? `$${job.salary_range_min.toLocaleString()} - $${job.salary_range_max.toLocaleString()}`
                                                : job.salary_range_min
                                                    ? `${t('from')} $${job.salary_range_min.toLocaleString()}`
                                                    : `${t('upTo')} $${job.salary_range_max?.toLocaleString()}`
                                            }
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 mt-4">
                                        <Link to={`/jobs/${job.id}`}>
                                            <Button size="sm" variant="outline">
                                                <Eye className="h-4 w-4 me-2" />
                                                {t('viewDetails')}
                                            </Button>
                                        </Link>

                                        {canManageJobs && (
                                            <>
                                                <Link to={`/jobs/${job.id}/edit`}>
                                                    <Button size="sm" variant="outline">
                                                        <Edit className="h-4 w-4 me-2" />
                                                        {t('edit')}
                                                    </Button>
                                                </Link>

                                                {job.status === 'draft' && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={() => updateStatusMutation.mutate({ jobId: job.id, status: 'open' })}
                                                    >
                                                        {t('publish')}
                                                    </Button>
                                                )}

                                                {job.status === 'open' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => updateStatusMutation.mutate({ jobId: job.id, status: 'closed' })}
                                                    >
                                                        {t('close')}
                                                    </Button>
                                                )}

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 hover:text-red-700"
                                                    onClick={() => setDeleteJob(job)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </EnhancedCard>
                ))}

                {filteredJobs?.length === 0 && (
                    <div className="prime-card">
                        <div className="prime-card-body text-center py-12">
                            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('noJobsFound')}</h3>
                            <p className="text-gray-600 mb-4">
                                {searchTerm ? t('tryAdjusting') : t('createFirst')}
                            </p>
                            {canManageJobs && !searchTerm && (
                                <Link to="/jobs/new">
                                    <Button className="bg-hotel-navy hover:bg-hotel-navy-light">
                                        <Plus className="h-4 w-4 me-2" />
                                        {t('create')}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
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
