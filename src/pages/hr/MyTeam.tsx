import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Loader2, Users, Mail, Phone, Clock, Award, CheckSquare, AlertTriangle, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { useRequestsInbox } from '@/hooks/useRequests'
import { useTasks } from '@/hooks/useTasks'

export default function MyTeam() {
    const { t } = useTranslation(['hr', 'common'])
    const { user } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')

    // Fetch direct reports
    const { data: teamMembers, isLoading } = useQuery({
        queryKey: ['my-team', user?.id],
        queryFn: async () => {
            if (!user?.id) return []

            // Fetch users where reporting_to is the current user
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    id, 
                    full_name, 
                    email, 
                    job_title, 
                    avatar_url, 
                    staff_id, 
                    phone,
                    is_active,
                    department:user_departments(departments(name))
                `)
                .eq('reporting_to', user.id)
                .order('full_name')

            if (error) throw error
            return data
        },
        enabled: !!user?.id
    })

    // Fetch team requests (using the smart routing in useRequestsInbox which handles supervisor visibility)
    const { data: teamRequests, isLoading: isLoadingRequests } = useRequestsInbox({
        status: ['pending_supervisor_approval', 'pending_hr_review']
    })

    // Only count requests where the current user is the actual supervisor or current assignee
    const pendingApprovalsCount = teamRequests?.filter(req =>
        req.supervisor_id === user?.id || req.current_assignee_id === user?.id
    ).length || 0

    // Fetch team tasks 
    // We get tasks assigned to anyone in the direct reports list
    const teamMemberIds = teamMembers?.map(m => m.id) || []

    // Since useTasks doesn't support an array of assignedTo natively yet, we do a custom query 
    // for the dashboard metric
    const { data: teamTasksData, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['team-tasks-count', teamMemberIds],
        queryFn: async () => {
            if (teamMemberIds.length === 0) return 0

            const { count, error } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .in('assigned_to_id', teamMemberIds)
                .in('status', ['open', 'todo', 'in_progress', 'pending'])
                .eq('is_deleted', false)

            if (error) throw error
            return count || 0
        },
        enabled: teamMemberIds.length > 0
    })

    const filteredTeam = teamMembers?.filter(member =>
        member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('common:my_team', 'My Team')}
                description={t('team.description', 'Manage and view details of your direct reports')}
            />

            {/* Manager Dashboard Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            {t('team.total_members', 'Total Team Members')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800">
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : teamMembers?.length || 0}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            {teamMembers?.filter(m => m.is_active)?.length || 0} {t('common:active', 'Active')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            {t('team.pending_requests', 'Pending Approvals')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                            {isLoadingRequests ? (
                                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                            ) : (
                                <span className={pendingApprovalsCount > 0 ? "text-amber-600" : "text-slate-800"}>
                                    {pendingApprovalsCount}
                                </span>
                            )}
                            <Button variant="outline" size="sm" asChild className="ml-auto text-xs h-8">
                                <Link to="/hr/inbox">{t('actions.view_inbox', 'Go to Inbox')}</Link>
                            </Button>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            {t('team.leave_and_overtime', 'Leave & Overtime')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                            {t('team.open_tasks', 'Open Team Tasks')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                            {isLoadingTasks ? (
                                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                            ) : (
                                <span>{teamTasksData || 0}</span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            {t('team.assigned_to_reports', 'Assigned directly to reports')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('common:search', 'Search...')}
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm py-1">
                        {filteredTeam.length} {t('team.members_count', 'Members')}
                    </Badge>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
                </div>
            ) : filteredTeam.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium text-gray-900">{t('team.no_members', 'No team members found')}</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm">
                            {searchTerm
                                ? t('team.no_search_results', 'No team members match your search criteria.')
                                : t('team.no_direct_reports', 'You do not have any direct reports assigned to you in the organizational structure.')}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredTeam.map(member => (
                        <Card key={member.id} className="overflow-hidden hover:border-hotel-gold/30 transition-colors">
                            <CardContent className="p-0">
                                <div className="bg-slate-50 border-b p-4 flex flex-col items-center text-center">
                                    <Avatar className="h-20 w-20 border-2 border-white shadow-sm mb-3">
                                        <AvatarImage src={member.avatar_url || ''} />
                                        <AvatarFallback className="bg-hotel-navy text-white text-xl">
                                            {member.full_name?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <h3 className="font-semibold text-gray-900 truncate w-full" title={member.full_name}>
                                        {member.full_name}
                                    </h3>
                                    <p className="text-sm text-hotel-gold font-medium mt-1 truncate w-full" title={member.job_title}>
                                        {member.job_title || t('common:not_specified', 'Not specified')}
                                    </p>
                                    <div className="mt-2">
                                        <Badge variant={member.is_active ? "outline" : "secondary"} className={member.is_active ? "border-green-200 text-green-700 bg-green-50" : ""}>
                                            {member.is_active ? t('common:active', 'Active') : t('common:inactive', 'Inactive')}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="p-4 space-y-3 bg-white">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                        <span className="truncate" title={member.email}>{member.email}</span>
                                    </div>
                                    {member.phone && (
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                            <span>{member.phone}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Users className="h-4 w-4 mr-2 text-gray-400" />
                                        <span className="truncate">
                                            {/* @ts-ignore - Supabase nested array typing */}
                                            {member.department?.[0]?.departments?.name || t('team.no_department', 'No Department')}
                                        </span>
                                    </div>

                                    <div className="pt-3 flex gap-2 border-t mt-3">
                                        <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                                            <a href={`mailto:${member.email}`}>
                                                {t('team.message', 'Message')}
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
