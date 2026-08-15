import { UserSkillsDisplay } from '@/components/profile/UserSkillsDisplay'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useHRSettings } from '@/hooks/useSystemSettings'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Briefcase,
    Building,
    Calendar,
    Mail,
    MessageSquare,
    Phone,
    RefreshCw,
    Shield,
    Users
} from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import EmployeeDocuments from './EmployeeDocuments'
import EmployeeTrainingHistory from './EmployeeTrainingHistory'

type AppRole =
  | 'corporate_admin'
  | 'regional_admin'
  | 'regional_hr'
  | 'property_manager'
  | 'property_hr'
  | 'department_head'
  | 'manager'
  | 'staff'

interface DirectReport {
  id: string
  full_name: string
  job_title: string | null
  avatar_url: string | null
}

interface PublicProfileData {
  id: string
  full_name: string
  avatar_url: string | null
  job_title: string | null
  work_email: string
  phone_extension: string | null
  bio: string | null
  joining_date: string | null
  is_active: boolean
  staff_id: string | null
  manager_id: string | null
  manager_name: string | null
  manager_title: string | null
  property_names: string[] | null
  department_names: string[] | null
  roles: AppRole[] | null
  skills: string[] | null
  certifications: string[] | null
  direct_reports: DirectReport[] | null
  updated_at: string
  is_edited: boolean
}

interface PrivateProfileData {
  date_of_birth: string | null
  employee_id: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  national_id: string | null
  salary_grade: string | null
  phone: string | null
  nationality: string | null
  blood_group: string | null
  iqama_number: string | null
  iqama_expiry: string | null
}

const HR_ADMIN_ROLES: AppRole[] = ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']

const isValidUuid = (value?: string | null) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

function getInitials(name?: string | null) {
  return name
    ? name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    : '??'
}

export default function UserProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation(['profile', 'common'])
  const { user, primaryRole } = useAuth()
  const { iqamaExpiryWarningDays } = useHRSettings()
  const isValidProfileId = isValidUuid(id)

  const canViewPrivate = useMemo(() => {
    if (!id || !user?.id) return false
    return user.id === id || HR_ADMIN_ROLES.includes((primaryRole || 'staff') as AppRole)
  }, [id, user?.id, primaryRole])

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['employee-public-profile', id],
    queryFn: async (): Promise<PublicProfileData> => {
      if (!id) throw new Error('No user ID provided')

      const { data, error } = await supabase.rpc('get_employee_public_profile', {
        p_profile_id: id
      })

      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (!row) throw new Error('Profile not found')
      return row as unknown as PublicProfileData
    },
    enabled: !!id && isValidProfileId
  })

  const { data: privateProfile } = useQuery({
    queryKey: ['employee-private-profile', id, canViewPrivate],
    queryFn: async (): Promise<PrivateProfileData | null> => {
      if (!id || !canViewPrivate) return null
      const { data, error } = await supabase.rpc('get_employee_private_profile', {
        p_profile_id: id,
        p_reason: 'profile_page_view'
      })

      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      return (row || null) as unknown as PrivateProfileData | null
    },
    enabled: !!id && isValidProfileId && canViewPrivate
  })

  if (id && !isValidProfileId) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">{t('common:error', 'Error')}</p>
            <p className="text-sm">{t('profile:invalid_user_id', 'Invalid user profile ID')}</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 me-2" />
                {t('common:go_back', 'Go Back')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const properties = profile?.property_names || []
  const departments = profile?.department_names || []
  const roles = profile?.roles || []
  const directReports = Array.isArray(profile?.direct_reports) ? profile.direct_reports : []
  const skills = profile?.skills || []
  const certifications = profile?.certifications || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">{t('common:error', 'Error')}</p>
            <p className="text-sm">{t('common:messages.error_action_failed', 'Unable to load profile')}</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 me-2" />
                {t('common:go_back', 'Go Back')}
              </Button>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 me-2" />
                {t('common:actions.retry', 'Retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[800px]">
          <TabsTrigger value="overview">{t('profile:overview', 'Overview')}</TabsTrigger>
          <TabsTrigger value="skills">{t('profile:skills_and_competencies', 'Skills')}</TabsTrigger>
          <TabsTrigger value="training">{t('profile:training', 'Training')}</TabsTrigger>
          <TabsTrigger value="documents">{t('profile:documents', 'Documents')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6 space-y-8">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-80 flex flex-col items-center text-center gap-4">
                  <div className="relative p-2">
                    <div className="absolute inset-0 rounded-full bg-hotel-gold/5 blur-2xl transition-all duration-1000 group-hover:bg-hotel-gold/10" />
                    <Avatar className="h-44 w-44 border-8 border-white shadow-2xl relative z-10 ring-1 ring-hotel-gold/10">
                      <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                      <AvatarFallback className="text-4xl bg-gradient-to-br from-hotel-navy to-hotel-navy-light text-white font-serif">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -end-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full z-20 shadow-lg" title="Online" />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-3xl font-bold text-hotel-navy capitalize tracking-tight">
                      {profile.full_name}
                    </h2>
                    {profile.job_title && (
                      <p className="text-hotel-gold font-semibold uppercase tracking-widest text-[10px] mt-1">
                        {profile.job_title}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge variant={profile.is_active ? 'default' : 'secondary'}>
                      {profile.is_active ? t('common:active', 'Active') : t('common:inactive', 'Inactive')}
                    </Badge>
                    {roles.map((role) => (
                      <Badge key={role} variant="outline" className="border-hotel-gold text-hotel-gold">
                        {role.replaceAll('_', ' ')}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex w-full gap-2 pt-2">
                    <Button
                      className="flex-1"
                      onClick={() => navigate(`/messaging?startChatWith=${profile.id}`)}
                    >
                      <MessageSquare className="h-4 w-4 me-2" />
                      {t('directory:send_message', 'Send Message')}
                    </Button>
                    <Button variant="outline" onClick={() => navigate(-1)}>
                      <ArrowLeft className="h-4 w-4 me-2" />
                      {t('common:go_back', 'Back')}
                    </Button>
                  </div>
                </div>

                <div className="flex-1 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-hotel-gold/10 pb-2">
                        <Mail className="h-4 w-4 text-hotel-gold" />
                        <h3 className="font-bold text-hotel-navy uppercase tracking-wider text-xs">
                          {t('profile:general_info', 'General')}
                        </h3>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a href={`mailto:${profile.work_email}`} className="text-gray-700 hover:text-hotel-gold">
                            {profile.work_email}
                          </a>
                        </div>
                        {profile.phone_extension && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">Ext. {profile.phone_extension}</span>
                          </div>
                        )}
                        {profile.joining_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">
                              {t('profile:hire_date', 'Joining Date')}: {format(new Date(profile.joining_date), 'MMMM d, yyyy')}
                            </span>
                          </div>
                        )}
                        {profile.staff_id && (
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{t('profile:staff_id', 'Employee ID')}: {profile.staff_id}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-hotel-gold/10 pb-2">
                        <Building className="h-4 w-4 text-hotel-gold" />
                        <h3 className="font-bold text-hotel-navy uppercase tracking-wider text-xs">
                          {t('profile:org_info', 'Organization')}
                        </h3>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{properties.join(', ') || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{departments.join(', ') || '-'}</span>
                        </div>
                        {profile.manager_id && profile.manager_name && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <button
                              className="text-hotel-gold hover:underline font-medium"
                              onClick={() => navigate(`/profile/${profile.manager_id}`)}
                            >
                              {profile.manager_name}
                              {profile.manager_title ? ` (${profile.manager_title})` : ''}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {profile.bio && (
                    <>
                      <Separator className="bg-hotel-gold/10" />
                      <div className="space-y-2">
                        <h3 className="font-bold text-hotel-navy uppercase tracking-wider text-xs">
                          {t('profile:bio', 'Bio / About')}
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                      </div>
                    </>
                  )}

                  {directReports.length > 0 && (
                    <>
                      <Separator className="bg-hotel-gold/10" />
                      <div className="space-y-3">
                        <h3 className="font-bold text-hotel-navy uppercase tracking-wider text-xs">
                          {t('profile:team_members', 'Team Members')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {directReports.map((report) => (
                            <button
                              key={report.id}
                              className="flex items-center gap-3 rounded-md border px-3 py-2 text-start hover:bg-gray-50"
                              onClick={() => navigate(`/profile/${report.id}`)}
                            >
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={report.avatar_url || ''} />
                                <AvatarFallback>{getInitials(report.full_name)}</AvatarFallback>
                              </Avatar>
                              <span className="min-w-0">
                                <span className="block font-medium truncate">{report.full_name}</span>
                                <span className="block text-xs text-gray-500 truncate">{report.job_title || '-'}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {canViewPrivate && privateProfile && (
                    <>
                      <Separator className="bg-hotel-gold/10" />
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <h3 className="font-bold text-red-700 uppercase tracking-wider text-xs">
                            {t('profile:private_info', 'Private HR/Admin Info')}
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-gray-500 mb-1">{t('profile:date_of_birth', 'Date of Birth')}</div>
                            <div className="font-medium">
                              {privateProfile.date_of_birth ? format(new Date(privateProfile.date_of_birth), 'MMMM d, yyyy') : '-'}
                            </div>
                          </div>
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-gray-500 mb-1">{t('profile:staff_id', 'Employee ID')}</div>
                            <div className="font-medium">{privateProfile.employee_id || '-'}</div>
                          </div>
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-gray-500 mb-1">{t('profile:emergency_contact_name', 'Emergency Contact')}</div>
                            <div className="font-medium">{privateProfile.emergency_contact_name || '-'}</div>
                          </div>
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-gray-500 mb-1">{t('profile:emergency_contact_phone', 'Emergency Phone')}</div>
                            <div className="font-medium">{privateProfile.emergency_contact_phone || '-'}</div>
                          </div>
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-gray-500 mb-1">{t('profile:national_id', 'National ID')}</div>
                            <div className="font-medium">{privateProfile.national_id || '-'}</div>
                          </div>
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-gray-500 mb-1">{t('profile:salary_grade', 'Salary Grade')}</div>
                            <div className="font-medium">{privateProfile.salary_grade || '-'}</div>
                          </div>
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-gray-500 mb-1">{t('profile:phone_number', 'Phone Number')}</div>
                            <div className="font-medium">{privateProfile.phone || '-'}</div>
                          </div>
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-gray-500 mb-1">{t('profile:nationality', 'Nationality')}</div>
                            <div className="font-medium">{privateProfile.nationality || '-'}</div>
                          </div>
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-gray-500 mb-1">{t('profile:blood_group', 'Blood Group')}</div>
                            <div className="font-medium">{privateProfile.blood_group || '-'}</div>
                          </div>
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-gray-500 mb-1">{t('profile:iqama_number', 'Iqama Number')}</div>
                            <div className="font-medium">{privateProfile.iqama_number || '-'}</div>
                          </div>
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-gray-500 mb-1">{t('profile:iqama_expiry', 'Iqama Expiry')}</div>
                            <div className="font-medium flex items-center justify-between">
                              <span>{privateProfile.iqama_expiry ? format(new Date(privateProfile.iqama_expiry), 'MMMM d, yyyy') : '-'}</span>
                              {privateProfile.iqama_expiry && (() => {
                                const daysLeft = Math.ceil((new Date(privateProfile.iqama_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                if (daysLeft <= iqamaExpiryWarningDays) {
                                  return (
                                    <Badge variant="destructive" className="text-[10px] gap-1 animate-pulse">
                                      <AlertTriangle className="w-3 h-3" />
                                      {daysLeft <= 0 ? 'Expired' : `Expires in ${daysLeft} days (Threshold: ${iqamaExpiryWarningDays}d)`}
                                    </Badge>
                                  )
                                }
                                return null
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <div className="space-y-4">
            <UserSkillsDisplay userId={id} />

            <Card>
              <CardHeader>
                <CardTitle>{t('profile:certifications', 'Certifications')}</CardTitle>
              </CardHeader>
              <CardContent>
                {certifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('profile:no_certifications', 'No certifications recorded yet.')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {certifications.map((cert) => (
                      <Badge key={cert} variant="outline">{cert}</Badge>
                    ))}
                  </div>
                )}
                {skills.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">{t('profile:skills_and_competencies', 'Skills')}</div>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <Badge key={skill} className="bg-blue-50 text-blue-700 border-blue-200" variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="training">
          <EmployeeTrainingHistory userId={id} />
        </TabsContent>

        <TabsContent value="documents">
          <EmployeeDocuments userId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
