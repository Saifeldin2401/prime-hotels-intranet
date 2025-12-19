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
    Mail,
    Phone,
    Building,
    MapPin,
    Calendar,
    Briefcase,
    Users,
    ArrowLeft,
    RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'

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
                .select('id, full_name, email, phone, job_title, avatar_url, hire_date, is_active, reporting_to')
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
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 me-2" />
                    {t('common:back', 'Back')}
                </Button>
                <h1 className="text-2xl font-bold">{t('profile:employee_profile', 'Employee Profile')}</h1>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Avatar & Basic Info */}
                        <div className="flex flex-col items-center text-center md:w-64">
                            <Avatar className="h-32 w-32 mb-4">
                                <AvatarImage src={profile.avatar_url || ''} />
                                <AvatarFallback className="text-2xl bg-primary text-white">
                                    {getInitials(profile.full_name)}
                                </AvatarFallback>
                            </Avatar>
                            <h2 className="text-xl font-bold">{profile.full_name}</h2>
                            {profile.job_title && (
                                <p className="text-gray-600">{profile.job_title}</p>
                            )}
                            <div className="flex gap-2 mt-2">
                                <Badge variant={profile.is_active ? 'default' : 'secondary'}>
                                    {profile.is_active ? t('common:active', 'Active') : t('common:inactive', 'Inactive')}
                                </Badge>
                                {profile.roles?.map((r, i) => (
                                    <Badge key={i} variant="outline">{r.role}</Badge>
                                ))}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Contact */}
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-gray-900">{t('profile:contact_info', 'Contact Information')}</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                            <a href={`mailto:${profile.email}`} className="hover:text-primary hover:underline">
                                                {profile.email}
                                            </a>
                                        </div>
                                        {profile.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-gray-400" />
                                                <a href={`tel:${profile.phone}`} className="hover:text-primary hover:underline" dir="ltr">
                                                    {profile.phone}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Organization */}
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-gray-900">{t('profile:organization', 'Organization')}</h3>
                                    <div className="space-y-2 text-sm">
                                        {profile.properties && profile.properties.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-gray-400" />
                                                <span>{profile.properties.map(p => p.name).join(', ')}</span>
                                            </div>
                                        )}
                                        {profile.departments && profile.departments.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <Building className="h-4 w-4 text-gray-400" />
                                                <span>{profile.departments.map(d => d.name).join(', ')}</span>
                                            </div>
                                        )}
                                        {profile.manager && (
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-gray-400" />
                                                <span>
                                                    {t('profile:reports_to', 'Reports to')}: {' '}
                                                    <Button
                                                        variant="link"
                                                        className="p-0 h-auto text-primary"
                                                        onClick={() => navigate(`/profile/${profile.manager?.id}`)}
                                                    >
                                                        {profile.manager.full_name}
                                                    </Button>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Employment */}
                            <div className="pt-4 border-t">
                                <h3 className="font-semibold text-gray-900 mb-3">{t('profile:employment', 'Employment')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    {profile.job_title && (
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="h-4 w-4 text-gray-400" />
                                            <span>{profile.job_title}</span>
                                        </div>
                                    )}
                                    {profile.hire_date && (
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span>
                                                {t('profile:hire_date', 'Hired')}: {format(new Date(profile.hire_date), 'MMM d, yyyy')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
