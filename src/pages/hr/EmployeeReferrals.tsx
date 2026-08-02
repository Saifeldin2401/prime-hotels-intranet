import { CandidateProfileDialog } from '@/components/hr/CandidateProfileDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { exportRowsToXlsx } from '@/lib/excel'
import { supabase } from '@/lib/supabase'
import { formatRelativeTime } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import type { jsPDF as JsPDFType } from 'jspdf'
import {
    Building2,
    CheckCircle, Clock,
    Download,
    ExternalLink,
    Eye,
    FileDown, LineChart,
    Plus,
    UserPlus,
    Users
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

const statusColors: Record<string, string> = {
  received: 'bg-blue-100 text-blue-800',
  review: 'bg-yellow-100 text-yellow-800',
  interview: 'bg-purple-100 text-purple-800',
  hired: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  shortlisted: 'bg-indigo-100 text-indigo-800',
  offer: 'bg-emerald-100 text-emerald-800'
}

const statusLabels: Record<string, string> = {
  received: 'Submitted',
  review: 'Under Review',
  interview: 'Interview',
  hired: 'Hired',
  rejected: 'Rejected',
  shortlisted: 'Shortlisted',
  offer: 'Offer'
}

export default function EmployeeReferrals() {
  const { t } = useTranslation('hr')
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [jobFilter, setJobFilter] = useState('all')
  const [referrerFilter, setReferrerFilter] = useState('all')
  const [selectedReferral, setSelectedReferral] = useState<any>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  // Main referrals query
  const { data: referrals, isLoading, error } = useQuery({
    queryKey: ['employee-referrals', statusFilter, jobFilter, referrerFilter, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('job_applications')
        .select('*')
        .not('referred_by', 'is', null)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (jobFilter !== 'all') {
        query = query.eq('job_posting_id', jobFilter)
      }

      const canViewAll = hasPermission('hr.manage_referrals')

      if (!canViewAll && user?.id) {
        query = query.eq('referred_by', user.id)
      } else if (referrerFilter !== 'all') {
        query = query.eq('referred_by', referrerFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!user?.id
  })

  // Profiles for referrer names
  const { data: profiles } = useQuery({
    queryKey: ['profiles-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name')
      return data || []
    }
  })

  // Job postings with property and department
  const { data: jobPostings } = useQuery({
    queryKey: ['job-postings-lookup'],
    queryFn: async () => {
      const { data } = await supabase
        .from('job_postings')
        .select(`
                    id, 
                    title, 
                    property_id,
                    department_id,
                    property:properties(name),
                    department:departments(name)
                `)
      return data || []
    }
  })

  // Helper functions
  const getReferrerName = (id: string) => profiles?.find(p => p.id === id)?.full_name || 'Unknown'
  const getJobTitle = (id: string) => jobPostings?.find(j => j.id === id)?.title || 'Unknown Position'
  const getPropertyName = (jobId: string) => {
    const job = jobPostings?.find(j => j.id === jobId)
    return (job?.property as any)?.name || ''
  }
  const getDepartmentName = (jobId: string) => {
    const job = jobPostings?.find(j => j.id === jobId)
    return (job?.department as any)?.name || ''
  }

  // Check if user is HR
  const isHR = hasPermission('hr.manage_referrals')

  const jobOptions = useMemo(() => {
    if (!jobPostings) return []
    return jobPostings.map(j => ({
      value: j.id,
      label: j.title
    }))
  }, [jobPostings])

  const referrerOptions = useMemo(() => {
    if (!profiles) return []
    return profiles
      .map(p => ({
        value: p.id,
        label: p.full_name || p.id
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [profiles])

  // Stats
  const stats = useMemo(() => {
    const total = referrals?.length || 0
    const hired = referrals?.filter(r => r.status === 'hired').length || 0
    const pending = referrals?.filter(r => r.status && !['hired', 'rejected'].includes(r.status)).length || 0
    const ratio = total > 0 ? Math.round((hired / total) * 100) : 0
    return { total, hired, pending, ratio }
  }, [referrals])

  const topReferrers = useMemo(() => {
    if (!referrals?.length) return []
    const counts = new Map<string, number>()
    referrals.forEach(r => {
      if (r.referred_by) {
        counts.set(r.referred_by, (counts.get(r.referred_by) || 0) + 1)
      }
    })
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count, name: getReferrerName(id) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [referrals, profiles])

  const topJobs = useMemo(() => {
    if (!referrals?.length) return []
    const counts = new Map<string, number>()
    referrals.forEach(r => {
      if (r.job_posting_id) {
        counts.set(r.job_posting_id, (counts.get(r.job_posting_id) || 0) + 1)
      }
    })
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count, title: getJobTitle(id) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [referrals, jobPostings])

  const monthlyTrends = useMemo(() => {
    if (!referrals?.length) return []
    const map = new Map<string, number>()
    referrals.forEach(r => {
      const date = new Date(r.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      map.set(key, (map.get(key) || 0) + 1)
    })
    return [...map.entries()]
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
  }, [referrals])

  const maxTrendCount = useMemo(() => {
    if (!monthlyTrends.length) return 1
    return Math.max(...monthlyTrends.map(t => t.count))
  }, [monthlyTrends])

  const buildExportRows = () => {
    if (!referrals?.length) return []
    return referrals.map(r => ({
      Name: r.applicant_name,
      Email: r.applicant_email,
      Phone: r.applicant_phone || '',
      Position: getJobTitle(r.job_posting_id),
      Property: getPropertyName(r.job_posting_id),
      Department: getDepartmentName(r.job_posting_id),
      Referrer: getReferrerName(r.referred_by),
      Status: statusLabels[r.status] || r.status,
      Date: new Date(r.created_at).toLocaleDateString()
    }))
  }

  const handleExportExcel = async () => {
    if (!referrals?.length) return
    try {
      const rows = buildExportRows()
      await exportRowsToXlsx(
        rows,
        `referrals_${new Date().toISOString().split('T')[0]}.xlsx`,
        'Referrals'
      )
    } catch (err) {
      toast.error(err?.message || 'Failed to export Excel')
    }
  }

  const handleExportPDF = async () => {
    if (!referrals?.length) return
    const rows = buildExportRows()
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF('p', 'pt')
    doc.setFontSize(14)
    doc.text('Employee Referrals Report', 40, 40)
    autoTable(doc, {
      startY: 60,
      head: [Object.keys(rows[0])],
      body: rows.map(row => Object.values(row)),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [26, 38, 57] }
    })
    doc.save(`referrals_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // View candidate profile
  const handleViewProfile = (referral) => {
    setSelectedReferral(referral)
    setProfileOpen(true)
  }

  const handleOpenCv = async (referral) => {
    try {
      if (referral.cv_url) {
        window.open(referral.cv_url, '_blank', 'noopener,noreferrer')
        return
      }
      if (!referral.cv_bucket || !referral.cv_path) return

      const { data, error } = await supabase.storage
        .from(referral.cv_bucket)
        .createSignedUrl(referral.cv_path, 60 * 10)

      if (error || !data?.signedUrl) {
        throw error || new Error('Failed to generate secure link')
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Failed to open CV:', err)
      toast.error(err?.message || 'Unable to open CV')
    }
  }

  // Filter referrals
  const filteredReferrals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!referrals?.length) return []
    if (!term) return referrals
    return referrals.filter(r => {
      const haystack = [
        r.applicant_name,
        r.applicant_email,
        r.applicant_phone,
        getJobTitle(r.job_posting_id),
        getReferrerName(r.referred_by)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [referrals, searchTerm, jobPostings, profiles])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        Error loading referrals: {(error as Error).message}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('referrals.title')}
        description={t('referrals.description')}
        actions={
          <div className="flex gap-2">
            {isHR && referrals && referrals.length > 0 && (
              <>
                <Button variant="outline" onClick={handleExportExcel}>
                  <FileDown className="h-4 w-4 me-2" />
                  {t('referrals.export_excel', { defaultValue: 'Export Excel' })}
                </Button>
                <Button variant="outline" onClick={handleExportPDF}>
                  <Download className="h-4 w-4 me-2" />
                  {t('referrals.export_pdf', { defaultValue: 'Export PDF' })}
                </Button>
              </>
            )}
            <Link to="/jobs">
              <Button>
                <Plus className="h-4 w-4 me-2" />
                {t('referrals.new_referral', { defaultValue: 'New Referral' })}
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium text-gray-600">{t('referrals.stats.total')}</span>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium text-gray-600">{t('referrals.stats.hired')}</span>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.hired}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium text-gray-600">{t('referrals.stats.pending', { defaultValue: 'Pending' })}</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium text-gray-600">{t('referrals.stats.ratio', { defaultValue: 'Hire Ratio' })}</span>
            <LineChart className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats.ratio}%</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder={t('referrals.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('status.all', { defaultValue: 'All Status' })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('status.all', { defaultValue: 'All Status' })}</SelectItem>
              <SelectItem value="received">{t('status.received', { defaultValue: 'Submitted' })}</SelectItem>
              <SelectItem value="review">{t('status.review', { defaultValue: 'Under Review' })}</SelectItem>
              <SelectItem value="interview">{t('status.interview', { defaultValue: 'Interview' })}</SelectItem>
              <SelectItem value="shortlisted">{t('status.shortlisted', { defaultValue: 'Shortlisted' })}</SelectItem>
              <SelectItem value="offer">{t('status.offer', { defaultValue: 'Offer' })}</SelectItem>
              <SelectItem value="hired">{t('status.hired', { defaultValue: 'Hired' })}</SelectItem>
              <SelectItem value="rejected">{t('status.rejected', { defaultValue: 'Rejected' })}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('referrals.filter_job', { defaultValue: 'All Jobs' })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('referrals.filter_job', { defaultValue: 'All Jobs' })}</SelectItem>
              {jobOptions.map(job => (
                <SelectItem key={job.value} value={job.value}>
                  {job.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isHR && (
            <Select value={referrerFilter} onValueChange={setReferrerFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('referrals.filter_referrer', { defaultValue: 'All Referrers' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('referrals.filter_referrer', { defaultValue: 'All Referrers' })}</SelectItem>
                {referrerOptions.map(referrer => (
                  <SelectItem key={referrer.value} value={referrer.value}>
                    {referrer.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isHR && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="bg-white border rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-600" />
              {t('referrals.top_referrers', { defaultValue: 'Top Referrers' })}
            </h4>
            <div className="space-y-3">
              {topReferrers.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('referrals.no_referrers', { defaultValue: 'No referral data yet.' })}</p>
              )}
              {topReferrers.map(ref => (
                <div key={ref.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{ref.name}</span>
                  <Badge variant="secondary">{ref.count}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              {t('referrals.top_jobs', { defaultValue: 'Top Jobs' })}
            </h4>
            <div className="space-y-3">
              {topJobs.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('referrals.no_jobs', { defaultValue: 'No referral data yet.' })}</p>
              )}
              {topJobs.map(job => (
                <div key={job.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{job.title}</span>
                  <Badge variant="secondary">{job.count}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <LineChart className="h-4 w-4 text-purple-600" />
              {t('referrals.trends', { defaultValue: 'Referral Trends' })}
            </h4>
            {monthlyTrends.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('referrals.no_trends', { defaultValue: 'No trend data yet.' })}</p>
            ) : (
              <div className="space-y-2">
                {monthlyTrends.map(item => (
                  <div key={item.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-12">{item.month}</span>
                    <div className="flex-1 h-2 rounded bg-gray-100">
                      <div
                        className="h-2 rounded bg-purple-500"
                        style={{ width: `${Math.min(100, (item.count / maxTrendCount) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-6 text-right">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Referrals List */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">{t('referrals.title')}</h3>
        </div>
        <div className="p-4 space-y-4">
          {filteredReferrals?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('referrals.no_referrals')}
            </div>
          ) : (
            filteredReferrals?.map((referral) => (
              <div key={referral.id} className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <UserPlus className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{referral.applicant_name}</h3>
                      <p className="text-sm text-gray-600">
                        {t('referrals.referred_by', {
                          referrer: getReferrerName(referral.referred_by),
                          position: getJobTitle(referral.job_posting_id)
                        })}
                      </p>
                      {/* Property & Department */}
                      {(getPropertyName(referral.job_posting_id) || getDepartmentName(referral.job_posting_id)) && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <Building2 className="h-3 w-3" />
                          {getPropertyName(referral.job_posting_id)}
                          {getDepartmentName(referral.job_posting_id) && (
                            <> • {getDepartmentName(referral.job_posting_id)}</>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatRelativeTime(referral.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={statusColors[referral.status] || 'bg-gray-100'}>
                      {t(`status.${referral.status}`, { defaultValue: statusLabels[referral.status] || referral.status })}
                    </Badge>
                    {/* CV Link */}
                    {(referral.cv_url || referral.cv_path) && (
                      <Button size="sm" variant="ghost" onClick={() => handleOpenCv(referral)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    {/* View Profile */}
                    <Button size="sm" variant="outline" onClick={() => handleViewProfile(referral)}>
                      <Eye className="h-4 w-4 me-1" />
                      {t('referrals.view')}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Candidate Profile Dialog */}
      <CandidateProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        referral={selectedReferral}
        referrerName={selectedReferral ? getReferrerName(selectedReferral.referred_by) : ''}
        jobTitle={selectedReferral ? getJobTitle(selectedReferral.job_posting_id) : ''}
        propertyName={selectedReferral ? getPropertyName(selectedReferral.job_posting_id) : ''}
        departmentName={selectedReferral ? getDepartmentName(selectedReferral.job_posting_id) : ''}
      />
    </div>
  )
}
