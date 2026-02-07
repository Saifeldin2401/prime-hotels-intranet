import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    ArrowLeft,
    RefreshCw,
    Shield,
    Award,
    FileText,
    User as UserIcon,
    AlertCircle,
    Mail,
    Phone,
    Building,
    MapPin,
    Calendar,
    Briefcase,
    Users
} from 'lucide-react'
import { format } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserSkillsDisplay } from '@/components/profile/UserSkillsDisplay'
import EmployeeDocuments from './EmployeeDocuments'
import { Separator } from '@/components/ui/separator'

interface ProfileData {
    id: string
    full_name: string
    email: string
    phone: string | null
    job_title: string | null
    avatar_url: string | null
    hire_date: string | null
    is_active: boolean
    reporting_to: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    nationality: string | null
    blood_group: string | null
    staff_id: string | null
    manager?: { id: string; full_name: string; job_title: string | null }
    properties?: { name: string }[]
    departments?: { name: string }[]
    roles?: { role: string }[]
}

export default function UserProfile() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { t, i18n } = useTranslation(['profile', 'common'])
    const isRTL = i18n.dir() === 'rtl'

    const { data: profile, isLoading, error } = useQuery({
        queryKey: ['user-profile', id],
        queryFn: async () => {
            if (!id) throw new Error('No user ID provided')

            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone, job_title, avatar_url, hire_date, is_active, reporting_to, emergency_contact_name, emergency_contact_phone, nationality, blood_group, staff_id')
                .eq('id', id)
                .single()

            if (error) throw error
            if (!data) throw new Error('User not found')

            // Fetch manager if exists
            let manager = null
            if (data.reporting_to) {
                const { data: managerData } = await supabase
                    .from('profiles')
                    .select('id, full_name, job_title')
                    .eq('id', data.reporting_to)
                    .single()
                manager = managerData
            }

            // Fetch properties
            const { data: propsData } = await supabase
                .from('user_properties')
                .select('properties(name)')
                .eq('user_id', id)

            // Fetch departments
            const { data: deptsData } = await supabase
                .from('user_departments')
                .select('departments(name)')
                .eq('user_id', id)

            // Fetch roles
            const { data: rolesData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', id)

            return {
                ...data,
                manager,
                properties: propsData?.map((p: any) => p.properties).filter(Boolean) || [],
                departments: deptsData?.map((d: any) => d.departments).filter(Boolean) || [],
                roles: rolesData || []
            } as ProfileData
        },
        enabled: !!id
    })

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'
    }

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
                        <p className="text-sm">User not found or you don't have access.</p>
                        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                            <ArrowLeft className="h-4 w-4 me-2" />
                            {t('common:go_back', 'Go Back')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                    <TabsTrigger value="overview">{t('profile:overview', 'Overview')}</TabsTrigger>
                    <TabsTrigger value="skills">{t('profile:skills_and_competencies', 'Skills')}</TabsTrigger>
                    <TabsTrigger value="documents">{t('profile:documents', 'Documents')}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row gap-8">
                                {/* Avatar & Basic Info */}
                                <div className="flex flex-col items-center text-center md:w-64">
                                    <Avatar className="h-40 w-40 mb-4 border-4 border-hotel-gold/20">
                                        <AvatarImage src={profile.avatar_url || ''} />
                                        <AvatarFallback className="text-3xl bg-hotel-navy text-white">
                                            {getInitials(profile.full_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <h2 className="text-2xl font-bold text-hotel-navy">{profile.full_name}</h2>
                                    {profile.job_title && (
                                        <p className="text-hotel-gold font-medium">{profile.job_title}</p>
                                    )}
                                    <div className="flex flex-wrap justify-center gap-2 mt-3">
                                        <Badge variant={profile.is_active ? 'default' : 'secondary'} className="bg-hotel-navy hover:bg-hotel-navy/90">
                                            {profile.is_active ? t('common:active', 'Active') : t('common:inactive', 'Inactive')}
                                        </Badge>
                                        {profile.roles?.map((r, i) => (
                                            <Badge key={i} variant="outline" className="border-hotel-gold text-hotel-gold">{r.role}</Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="flex-1 space-y-8">
                                    {/* General & Organization */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 border-b border-hotel-gold/10 pb-2">
                                                <UserIcon className="w-4 h-4 text-hotel-gold" />
                                                <h3 className="font-bold text-hotel-navy uppercase tracking-wider text-xs">{t('profile:general_info')}</h3>
                                            </div>
                                            <div className="space-y-3 text-sm">
                                                <div className="flex items-center gap-3">
                                                    <Mail className="h-4 w-4 text-gray-400" />
                                                    <a href={`mailto:${profile.email}`} className="text-gray-600 hover:text-hotel-gold transition-colors">
                                                        {profile.email}
                                                    </a>
                                                </div>
                                                {profile.phone && (
                                                    <div className="flex items-center gap-3">
                                                        <Phone className="h-4 w-4 text-gray-400" />
                                                        <a href={`tel:${profile.phone}`} className="text-gray-600 hover:text-hotel-gold transition-colors font-mono" dir="ltr">
                                                            {profile.phone}
                                                        </a>
                                                    </div>
                                                )}
                                                {profile.nationality && (
                                                    <div className="flex items-center gap-3">
                                                        <MapPin className="h-4 w-4 text-gray-400" />
                                                        <span className="text-gray-600">{profile.nationality}</span>
                                                    </div>
                                                )}
                                                {profile.blood_group && (
                                                    <div className="flex items-center gap-3">
                                                        <Shield className="h-4 w-4 text-gray-400" />
                                                        <span className="text-gray-600">{t('profile:blood_group')}: {profile.blood_group}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 border-b border-hotel-gold/10 pb-2">
                                                <Briefcase className="w-4 h-4 text-hotel-gold" />
                                                <h3 className="font-bold text-hotel-navy uppercase tracking-wider text-xs">{t('profile:org_info')}</h3>
                                            </div>
                                            <div className="space-y-3 text-sm">
                                                {profile.properties && profile.properties.length > 0 && (
                                                    <div className="flex items-center gap-3">
                                                        <Building className="h-4 w-4 text-gray-400" />
                                                        <span className="text-gray-600">{profile.properties.map(p => p.name).join(', ')}</span>
                                                    </div>
                                                )}
                                                {profile.departments && profile.departments.length > 0 && (
                                                    <div className="flex items-center gap-3">
                                                        <Users className="h-4 w-4 text-gray-400" />
                                                        <span className="text-gray-600">{profile.departments.map(d => d.name).join(', ')}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3">
                                                    <Shield className="h-4 w-4 text-gray-400" />
                                                    <span className="text-gray-600">ID: {profile.staff_id || 'PH-0000'}</span>
                                                </div>
                                                {profile.manager && (
                                                    <div className="flex items-center gap-3">
                                                        <UserIcon className="h-4 w-4 text-gray-400" />
                                                        <span className="text-gray-600">
                                                            {t('profile:reports_to')}: {' '}
                                                            <button
                                                                className="text-hotel-gold hover:underline font-medium"
                                                                onClick={() => navigate(`/profile/${profile.manager?.id}`)}
                                                            >
                                                                {profile.manager.full_name}
                                                            </button>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="bg-hotel-gold/10" />

                                    {/* Emergency & Employment */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 border-b border-hotel-gold/10 pb-2">
                                                <AlertCircle className="w-4 h-4 text-hotel-gold" />
                                                <h3 className="font-bold text-hotel-navy uppercase tracking-wider text-xs">{t('profile:emergency_info')}</h3>
                                            </div>
                                            <div className="space-y-2 text-sm text-gray-600">
                                                <p className="font-medium text-gray-900">{profile.emergency_contact_name || 'Not provided'}</p>
                                                <p className="font-mono" dir="ltr">{profile.emergency_contact_phone || '--'}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 border-b border-hotel-gold/10 pb-2">
                                                <Calendar className="w-4 h-4 text-hotel-gold" />
                                                <h3 className="font-bold text-hotel-navy uppercase tracking-wider text-xs">{t('profile:employment')}</h3>
                                            </div>
                                            <div className="space-y-2 text-sm text-gray-600">
                                                <p>
                                                    <span className="text-gray-400 me-2">{t('profile:hire_date')}:</span>
                                                    {profile.hire_date ? format(new Date(profile.hire_date), 'MMMM d, yyyy') : '---'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="skills">
                    <UserSkillsDisplay userId={id} />
                </TabsContent>

                <TabsContent value="documents">
                    <EmployeeDocuments userId={id} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
