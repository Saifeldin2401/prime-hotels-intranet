import { CreateReferralDialog } from '@/components/jobs/CreateReferralDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { DeleteConfirmation } from '@/components/shared/DeleteConfirmation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { getApplicationStatusColor, getRoutingDescription, getSeniorityBadgeColor } from '@/lib/cvRouting'
import { supabase } from '@/lib/supabase'
import type { JobApplication, JobPosting } from '@/lib/types'
import { formatRelativeTime } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Building2,
    Calendar,
    CheckCircle,
    DollarSign,
    Edit,
    FileText,
    Loader2, // Imported UserPlus
    Mail,
    MapPin,
    Phone,
    Trash2,
    UserPlus,
    Users,
    XCircle
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    open: 'bg-green-100 text-green-800',
    closed: 'bg-yellow-100 text-yellow-800',
    filled: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
}

export default function JobPostingDetail() {
    const { id } = useParams<{ id: string }>()
    const { roles } = useAuth()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { t, i18n } = useTranslation('jobs')
    const [deleteJob, setDeleteJob] = useState(false)
    const [referralJob, setReferralJob] = useState(false) // Added state
    const [cvLoadingId, setCvLoadingId] = useState<string | null>(null)
    const isRTL = i18n.dir() === 'rtl'

    const canManageJobs = (roles || []).some((userRole) =>
        ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr', 'property_manager'].includes(userRole.role)
    )

    const { data: job, isLoading } = useQuery({
        queryKey: ['job-posting', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('job_postings')
                .select(`
          *,
          property:properties(id, name),
          department:departments(id, name),
          created_by_profile:profiles!job_postings_created_by_fkey(id, full_name)
        `)
                .eq('id', id)
                .eq('is_deleted', false)
                .single()

            if (error) throw error
            return data as unknown as JobPosting
        },
        enabled: !!id
    })

    const { data: applications } = useQuery({
        queryKey: ['job-applications', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('job_applications')
                .select(`
          *,
          referrer:profiles!job_applications_referred_by_fkey(id, full_name)
        `)
                .eq('job_posting_id', id)
                .order('created_at', { ascending: false })

            if (error) throw error
            return (data || []) as unknown as JobApplication[]
        },
        enabled: !!id
    })

    const deleteJobMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('job_postings')
                .update({ is_deleted: true })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            navigate('/jobs')
        }
    })

    const updateApplicationMutation = useMutation({
        mutationFn: async ({ appId, status }: { appId: string, status: string }) => {
            const { error } = await supabase
                .from('job_applications')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', appId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-applications', id] })
        }
    })

    const handleOpenCv = async (app: JobApplication) => {
        try {
            if (app.cv_url) {
                window.open(app.cv_url, '_blank', 'noopener,noreferrer')
                return
            }
            if (!app.cv_bucket || !app.cv_path) return

            setCvLoadingId(app.id)
            const { data, error } = await supabase.storage
                .from(app.cv_bucket)
                .createSignedUrl(app.cv_path, 60 * 10)

            if (error || !data?.signedUrl) {
                throw error || new Error('Failed to generate secure link')
            }
            window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
        } catch (err) {
            console.error('Failed to open CV:', err)
            toast.error(err?.message || 'Unable to open CV')
        } finally {
            setCvLoadingId(null)
        }
    }

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
                title={job.title}
                description={
                    <div className="flex items-center gap-3 mt-2">
                        {job.property && (
                            <span className="flex items-center gap-1 text-sm">
                                <Building2 className="h-4 w-4" />
                                {job.property.name}
                            </span>
                        )}
                        {job.department && (
                            <span className="flex items-center gap-1 text-sm">
                                <MapPin className="h-4 w-4" />
                                {job.department.name}
                            </span>
                        )}
                    </div>
                }
                actions={
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setReferralJob(true)}>
                            <UserPlus className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                            {t('referrals.refer_candidate', { defaultValue: 'Refer Candidate' })}
                        </Button>

                        {canManageJobs && (
                            <>
                                <Link to={`/jobs/${id}/edit`}>
                                    <Button variant="outline">
                                        <Edit className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                                        {t('edit')}
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => setDeleteJob(true)}
                                >
                                    <Trash2 className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                                    {t('delete')}
                                </Button>
                            </>
                        )}
                    </div>
                }
            />

            <CreateReferralDialog
                open={referralJob}
                onOpenChange={setReferralJob}
                jobId={job.id}
                jobTitle={job.title}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList>
                            <TabsTrigger value="details">{t('jobDetails')}</TabsTrigger>
                            <TabsTrigger value="applications">
                                {t('applications')} ({applications?.length || 0})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-6">
                            {job.description && (
                                <div className="altus-card">
                                    <div className="altus-card-header">
                                        <h3 className="text-lg font-semibold">{t('jobDescription')}</h3>
                                    </div>
                                    <div className="altus-card-body">
                                        <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
                                    </div>
                                </div>
                            )}

                            {job.responsibilities && (
                                <div className="altus-card">
                                    <div className="altus-card-header">
                                        <h3 className="text-lg font-semibold">{t('responsibilities')}</h3>
                                    </div>
                                    <div className="altus-card-body">
                                        <p className="text-gray-700 whitespace-pre-wrap">{job.responsibilities}</p>
                                    </div>
                                </div>
                            )}

                            {job.requirements && (
                                <div className="altus-card">
                                    <div className="altus-card-header">
                                        <h3 className="text-lg font-semibold">{t('requirements')}</h3>
                                    </div>
                                    <div className="altus-card-body">
                                        <p className="text-gray-700 whitespace-pre-wrap">{job.requirements}</p>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="applications" className="space-y-4">
                            {applications && applications.length > 0 ? (
                                applications.map((app) => (
                                    <div key={app.id} className="altus-card">
                                        <div className="altus-card-body">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-semibold text-gray-900">{app.applicant_name}</h4>
                                                        <Badge className={getApplicationStatusColor(app.status)}>
                                                            {app.status}
                                                        </Badge>
                                                    </div>

                                                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="h-4 w-4" />
                                                            {app.applicant_email}
                                                        </div>
                                                        {app.applicant_phone && (
                                                            <div className="flex items-center gap-2">
                                                                <Phone className="h-4 w-4" />
                                                                {app.applicant_phone}
                                                            </div>
                                                        )}
                                                        {app.referrer && (
                                                            <div className="flex items-center gap-2">
                                                                <Users className="h-4 w-4" />
                                                                {t('referredBy')} {app.referrer.full_name}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4" />
                                                            {t('applied')} {formatRelativeTime(app.created_at)}
                                                        </div>
                                                    </div>

                                                    {app.cover_letter && (
                                                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                                                            <p className="text-gray-700 line-clamp-3">{app.cover_letter}</p>
                                                        </div>
                                                    )}

                                                    {canManageJobs && (
                                                        <div className="flex items-center gap-2 mt-4">
                                                            {app.status === 'received' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => updateApplicationMutation.mutate({ appId: app.id, status: 'review' })}
                                                                >
                                                                    {t('startReview')}
                                                                </Button>
                                                            )}
                                                            {app.status === 'review' && (
                                                                <>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => updateApplicationMutation.mutate({ appId: app.id, status: 'shortlisted' })}
                                                                    >
                                                                        <CheckCircle className={`h-4 w-4 ${isRTL ? 'ms-1' : 'me-1'}`} />
                                                                        {t('shortlist')}
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => updateApplicationMutation.mutate({ appId: app.id, status: 'rejected' })}
                                                                    >
                                                                        <XCircle className={`h-4 w-4 ${isRTL ? 'ms-1' : 'me-1'}`} />
                                                                        {t('reject')}
                                                                    </Button>
                                                                </>
                                                            )}
                                                            {app.status === 'shortlisted' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => updateApplicationMutation.mutate({ appId: app.id, status: 'interview' })}
                                                                >
                                                                    {t('scheduleInterview')}
                                                                </Button>
                                                            )}
                                                            {app.status === 'interview' && (
                                                                <>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => updateApplicationMutation.mutate({ appId: app.id, status: 'offer' })}
                                                                    >
                                                                        {t('makeOffer')}
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => updateApplicationMutation.mutate({ appId: app.id, status: 'rejected' })}
                                                                    >
                                                                        {t('reject')}
                                                                    </Button>
                                                                </>
                                                            )}
                                                            {app.status === 'offer' && (
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-green-600 hover:bg-green-700"
                                                                    onClick={() => updateApplicationMutation.mutate({ appId: app.id, status: 'hired' })}
                                                                >
                                                                    {t('markHired')}
                                                                </Button>
                                                            )}
                                                            {(app.cv_url || app.cv_path) && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleOpenCv(app)}
                                                                    disabled={cvLoadingId === app.id}
                                                                >
                                                                    {cvLoadingId === app.id ? (
                                                                        <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ms-1' : 'me-1'}`} />
                                                                    ) : (
                                                                        <FileText className={`h-4 w-4 ${isRTL ? 'ms-1' : 'me-1'}`} />
                                                                    )}
                                                                    {t('viewCv')}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="altus-card">
                                    <div className="altus-card-body text-center py-12">
                                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('noApplications')}</h3>
                                        <p className="text-gray-600">{t('noApplicationsDesc')}</p>
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="altus-card">
                        <div className="altus-card-header">
                            <h3 className="text-lg font-semibold">{t('jobInfo')}</h3>
                        </div>
                        <div className="altus-card-body space-y-4">
                            <div>
                                <p className="text-sm text-gray-600">{t('status.status')}</p>
                                <Badge className={`${statusColors[job.status as keyof typeof statusColors]} mt-1`}>
                                    {t(`status.${job.status}`)}
                                </Badge>
                            </div>

                            <div>
                                <p className="text-sm text-gray-600">{t('seniorityLevel')}</p>
                                <Badge className={`${getSeniorityBadgeColor(job.seniority_level)} mt-1`}>
                                    {t(`seniority.${job.seniority_level}`)}
                                </Badge>
                                <p className="text-xs text-gray-500 mt-1">
                                    {/* Description from routing logic, kept separate as it might be complex text, or should be translated via keys if possible */}
                                    {getRoutingDescription(job.seniority_level)}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-600">{t('employmentType')}</p>
                                <p className="text-sm font-medium text-gray-900 mt-1">
                                    {t(`employment_type.${job.employment_type}`)}
                                </p>
                            </div>

                            {(job.salary_range_min || job.salary_range_max) && (
                                <div>
                                    <p className="text-sm text-gray-600">{t('salaryRange')}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <DollarSign className="h-4 w-4 text-gray-500" />
                                        <p className="text-sm font-medium text-gray-900">
                                            {job.salary_range_min && job.salary_range_max
                                                ? `$${job.salary_range_min.toLocaleString()} - $${job.salary_range_max.toLocaleString()}`
                                                : job.salary_range_min
                                                    ? `${t('from')} $${job.salary_range_min.toLocaleString()}`
                                                    : `${t('upTo')} $${job.salary_range_max?.toLocaleString()}`
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}

                            {job.closes_at && (
                                <div>
                                    <p className="text-sm text-gray-600">{t('applicationDeadline')}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Calendar className="h-4 w-4 text-gray-500" />
                                        <p className="text-sm font-medium text-gray-900">
                                            {new Date(job.closes_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <p className="text-sm text-gray-600">{t('posted')}</p>
                                <p className="text-sm font-medium text-gray-900 mt-1">
                                    {formatRelativeTime(job.created_at)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation */}
            {deleteJob && (
                <DeleteConfirmation
                    open={deleteJob}
                    onOpenChange={(open) => !open && setDeleteJob(false)}
                    onConfirm={() => deleteJobMutation.mutate()}
                    itemName={job.title}
                    itemType={t('jobPosting')}
                />
            )}
        </div>
    )
}
