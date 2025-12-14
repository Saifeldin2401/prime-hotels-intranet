import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Link } from 'react-router-dom'
import { formatRelativeTime } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { CandidateProfileDialog } from '@/components/hr/CandidateProfileDialog'
import {
  Plus, Users, CheckCircle, DollarSign, Clock, UserPlus,
  Download, Building2, Eye, ExternalLink
} from 'lucide-react'

const statusColors: Record<string, string> = {
  received: 'bg-blue-100 text-blue-800',
  review: 'bg-yellow-100 text-yellow-800',
  interview: 'bg-purple-100 text-purple-800',
  hired: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
}

export default function EmployeeReferrals() {
  const { t } = useTranslation('hr')
  const { user, roles } = useAuth()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedReferral, setSelectedReferral] = useState<any>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  // Main referrals query
  const { data: referrals, isLoading, error } = useQuery({
    queryKey: ['employee-referrals', statusFilter, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('job_applications')
        .select('*')
        .not('referred_by', 'is', null)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const canViewAll = roles?.some(r =>
        ['regional_admin', 'regional_hr', 'property_hr', 'property_manager', 'general_manager'].includes(r.role)
      )

      if (!canViewAll && user?.id) {
        query = query.eq('referred_by', user.id)
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

  // Stats
  const stats = {
    total: referrals?.length || 0,
    hired: referrals?.filter(r => r.status === 'hired').length || 0
  }

  // CSV Export
  const handleExportCSV = () => {
    if (!referrals?.length) return

    const headers = ['Name', 'Email', 'Phone', 'Position', 'Property', 'Department', 'Referrer', 'Status', 'Date']
    const rows = referrals.map(r => [
      r.applicant_name,
      r.applicant_email,
      r.applicant_phone || '',
      getJobTitle(r.job_posting_id),
      getPropertyName(r.job_posting_id),
      getDepartmentName(r.job_posting_id),
      getReferrerName(r.referred_by),
      r.status,
      new Date(r.created_at).toLocaleDateString()
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `referrals_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // View candidate profile
  const handleViewProfile = (referral: any) => {
    setSelectedReferral(referral)
    setProfileOpen(true)
  }

  // Filter referrals
  const filteredReferrals = referrals?.filter(r =>
    r.applicant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.applicant_email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Check if user is HR
  const isHR = roles?.some(r => ['regional_admin', 'regional_hr', 'property_hr'].includes(r.role))

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
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
            <Link to="/jobs">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('referrals.new_referral', { defaultValue: 'New Referral' })}
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder={t('referrals.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('status.all')}</SelectItem>
              <SelectItem value="received">{t('status.received', { defaultValue: 'Received' })}</SelectItem>
              <SelectItem value="review">{t('status.review', { defaultValue: 'Review' })}</SelectItem>
              <SelectItem value="interview">{t('status.interview', { defaultValue: 'Interview' })}</SelectItem>
              <SelectItem value="hired">{t('status.hired')}</SelectItem>
              <SelectItem value="rejected">{t('status.rejected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
                        Referred by {getReferrerName(referral.referred_by)} for {getJobTitle(referral.job_posting_id)}
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
                      {referral.status}
                    </Badge>
                    {/* CV Link */}
                    {referral.cv_url && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={referral.cv_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {/* View Profile */}
                    <Button size="sm" variant="outline" onClick={() => handleViewProfile(referral)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
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
