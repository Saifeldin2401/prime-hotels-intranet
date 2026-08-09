import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/hooks/useAuth'
import { useRequestsInbox } from '@/hooks/useRequests'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, BarChart3, BookOpenCheck, CheckSquare, Clock, FolderKanban, GraduationCap, Loader2, Mail, Phone, Search, UserRoundSearch, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

interface TeamMember {
    id: string
    full_name: string | null
    email: string | null
    job_title: string | null
    avatar_url: string | null
    staff_id: string | null
    phone: string | null
    is_active: boolean
    department?: Array<{ departments?: { name?: string | null } | null }> | null
}

type AtRiskReason = 'low_completion' | 'low_score' | 'overdue_training' | 'cert_expiring'

interface TeamLearningTracking {
    assignedModules: number
    completedModules: number
    inProgressModules: number
    completionRate: number
    avgScore: number | null
    certificatesCount: number
    lastActivity: string | null
    overdueCount: number
    expiringCertCount: number
    atRisk: boolean
    atRiskReasons: AtRiskReason[]
}

interface TeamLearningTrackingSnapshot {
    byUser: Record<string, TeamLearningTracking>
    summary: {
        assignedModules: number
        completedModules: number
        overallCompletionRate: number
        certificatesCount: number
        atRiskCount: number
        overdueCount: number
        expiringCertCount: number
    }
}

const CERT_EXPIRY_LOOKAHEAD_DAYS = 30
const AT_RISK_REASON_LABELS: Record<AtRiskReason, string> = {
    low_completion: 'Low completion rate',
    low_score: 'Low quiz scores',
    overdue_training: 'Has expired/overdue training',
    cert_expiring: 'Certificate expiring soon'
}

export default function MyTeam() {
    const { t } = useTranslation(['hr', 'common'])
    const { user } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')
    const [atRiskOnly, setAtRiskOnly] = useState(false)

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
            return (data || []) as TeamMember[]
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

    const { data: teamLearningTracking, isLoading: isLoadingLearning } = useQuery({
        queryKey: ['team-learning-tracking', teamMemberIds],
        queryFn: async () => {
            if (teamMemberIds.length === 0) {
                return {
                    byUser: {},
                    summary: {
                        assignedModules: 0,
                        completedModules: 0,
                        overallCompletionRate: 0,
                        certificatesCount: 0,
                        atRiskCount: 0,
                        overdueCount: 0,
                        expiringCertCount: 0
                    }
                } satisfies TeamLearningTrackingSnapshot
            }

            const expiryHorizon = new Date(Date.now() + CERT_EXPIRY_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000).toISOString()

            const [progressResult, certResult, expiringCertResult] = await Promise.all([
                supabase
                    .from('training_progress')
                    .select('user_id, status, score_percentage, updated_at, content_type:lp_content_type')
                    .in('user_id', teamMemberIds)
                    .eq('lp_content_type', 'module'),
                supabase
                    .from('certificates')
                    .select('user_id')
                    .eq('certificate_type', 'training')
                    .eq('status', 'active')
                    .in('user_id', teamMemberIds),
                // Certs expiring soon are still "active" until they lapse - a separate,
                // narrower fetch keeps the certificatesCount above meaning "currently valid".
                supabase
                    .from('certificates')
                    .select('user_id')
                    .eq('status', 'active')
                    .in('user_id', teamMemberIds)
                    .not('expiry_date', 'is', null)
                    .lte('expiry_date', expiryHorizon)
                    .gte('expiry_date', new Date().toISOString())
            ])

            if (progressResult.error) throw progressResult.error
            if (certResult.error) throw certResult.error
            if (expiringCertResult.error) throw expiringCertResult.error

            const progressRows = progressResult.data || []
            const certRows = certResult.data || []
            const expiringCertRows = expiringCertResult.data || []

            const certsByUser = certRows.reduce<Record<string, number>>((acc, row) => {
                if (!row.user_id) return acc
                acc[row.user_id] = (acc[row.user_id] || 0) + 1
                return acc
            }, {})

            const expiringCertsByUser = expiringCertRows.reduce<Record<string, number>>((acc, row) => {
                if (!row.user_id) return acc
                acc[row.user_id] = (acc[row.user_id] || 0) + 1
                return acc
            }, {})

            const byUser = teamMemberIds.reduce<Record<string, TeamLearningTracking>>((acc, userId) => {
                const userRows = progressRows.filter((row) => row.user_id === userId)
                const assignedModules = userRows.length
                const completedModules = userRows.filter((row) => row.status === 'completed').length
                const inProgressModules = userRows.filter((row) => row.status === 'in_progress').length
                const overdueCount = userRows.filter((row) => row.status === 'expired').length
                const completionRate = assignedModules > 0
                    ? Math.round((completedModules / assignedModules) * 100)
                    : 0

                const scoredRows = userRows.filter((row) => typeof row.score_percentage === 'number')
                const avgScore = scoredRows.length > 0
                    ? Math.round(scoredRows.reduce((sum, row) => sum + Number(row.score_percentage), 0) / scoredRows.length)
                    : null

                const lastActivity = userRows.length > 0
                    ? userRows
                        .map((row) => row.updated_at)
                        .filter((value): value is string => typeof value === 'string')
                        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null
                    : null

                const certificatesCount = certsByUser[userId] || 0
                const expiringCertCount = expiringCertsByUser[userId] || 0

                const atRiskReasons: AtRiskReason[] = []
                if (assignedModules > 0 && completionRate < 50) atRiskReasons.push('low_completion')
                if (avgScore !== null && avgScore < 70) atRiskReasons.push('low_score')
                if (overdueCount > 0) atRiskReasons.push('overdue_training')
                if (expiringCertCount > 0) atRiskReasons.push('cert_expiring')

                acc[userId] = {
                    assignedModules,
                    completedModules,
                    inProgressModules,
                    completionRate,
                    avgScore,
                    certificatesCount,
                    lastActivity,
                    overdueCount,
                    expiringCertCount,
                    atRisk: atRiskReasons.length > 0,
                    atRiskReasons
                }
                return acc
            }, {})

            const assignedModules = Object.values(byUser).reduce((sum, row) => sum + row.assignedModules, 0)
            const completedModules = Object.values(byUser).reduce((sum, row) => sum + row.completedModules, 0)
            const certificatesCount = Object.values(byUser).reduce((sum, row) => sum + row.certificatesCount, 0)
            const atRiskCount = Object.values(byUser).filter((row) => row.atRisk).length
            const overdueCount = Object.values(byUser).reduce((sum, row) => sum + row.overdueCount, 0)
            const expiringCertCount = Object.values(byUser).reduce((sum, row) => sum + row.expiringCertCount, 0)

            return {
                byUser,
                summary: {
                    assignedModules,
                    completedModules,
                    overallCompletionRate: assignedModules > 0 ? Math.round((completedModules / assignedModules) * 100) : 0,
                    certificatesCount,
                    atRiskCount,
                    overdueCount,
                    expiringCertCount
                }
            } satisfies TeamLearningTrackingSnapshot
        },
        enabled: teamMemberIds.length > 0
    })

    const trackingByUser = teamLearningTracking?.byUser || {}
    const trackingSummary = teamLearningTracking?.summary || {
        assignedModules: 0,
        completedModules: 0,
        overallCompletionRate: 0,
        certificatesCount: 0,
        atRiskCount: 0,
        overdueCount: 0,
        expiringCertCount: 0
    }

    const filteredTeam = (teamMembers?.filter(member =>
        member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []).filter(member => !atRiskOnly || trackingByUser[member.id]?.atRisk)

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('common:my_team', 'My Team')}
                description={t('team.description', 'Manage and view details of your direct reports')}
            />

            <Card className="border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-3xl space-y-4">
                            <Badge className="bg-white/10 text-white border-white/15 hover:bg-white/10">
                                {t('common:my_team', 'My Team')}
                            </Badge>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
                                    {t('team.workspace_title', 'Team Control Center')}
                                </h2>
                                <p className="mt-3 max-w-2xl text-sm md:text-base leading-7 text-slate-200">
                                    {t('team.workspace_description', 'Review approvals, delegated work, learning follow-up, and employee records from one team workspace.')}
                                </p>
                            </div>
                        </div>

                        <div className="grid w-full gap-3 sm:grid-cols-2 2xl:grid-cols-4 xl:max-w-4xl">
                            <Button asChild variant="secondary" className="h-auto min-h-14 justify-between px-4 py-3 text-left whitespace-normal bg-white text-slate-900 hover:bg-slate-100">
                                <Link to="/hr/inbox">
                                    <span>{t('actions.view_inbox', 'Go to Inbox')}</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="secondary" className="h-auto min-h-14 justify-between px-4 py-3 text-left whitespace-normal bg-white/10 text-white border border-white/10 hover:bg-white/15">
                                <Link to={teamMemberIds.length > 0 ? `/tasks?assignedToIds=${teamMemberIds.join(',')}` : '/tasks'}>
                                    <span>{t('team.open_tasks', 'Open Team Tasks')}</span>
                                    <FolderKanban className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="secondary" className="h-auto min-h-14 justify-between px-4 py-3 text-left whitespace-normal bg-white/10 text-white border border-white/10 hover:bg-white/15">
                                <Link to="/training/assignments">
                                    <span>{t('team.training_follow_up', 'Training Assignments')}</span>
                                    <BookOpenCheck className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="secondary" className="h-auto min-h-14 justify-between px-4 py-3 text-left whitespace-normal bg-white/10 text-white border border-white/10 hover:bg-white/15">
                                <Link to="/directory">
                                    <span>{t('team.directory_access', 'Employee Directory')}</span>
                                    <UserRoundSearch className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Manager Dashboard Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
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
                            <Button variant="outline" size="sm" asChild className="ms-auto text-xs h-8">
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

                <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-indigo-500" />
                            {t('team.learning_completion', 'Learning Completion')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800">
                            {isLoadingLearning ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : `${trackingSummary.overallCompletionRate}%`}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            {`${trackingSummary.completedModules}/${trackingSummary.assignedModules} ${t('team.modules_completed', 'modules completed')}`}
                        </p>
                    </CardContent>
                </Card>

                <Card
                    role="button"
                    tabIndex={0}
                    onClick={() => setAtRiskOnly(prev => !prev)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAtRiskOnly(prev => !prev) } }}
                    className={`border-slate-200 shadow-sm rounded-2xl cursor-pointer transition-colors ${atRiskOnly ? 'bg-rose-50 border-rose-200 ring-1 ring-rose-200' : 'bg-white hover:border-rose-200'}`}
                >
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            {t('team.needs_follow_up', 'Needs Follow-up')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800">
                            {isLoadingLearning ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : trackingSummary.atRiskCount}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            {isLoadingLearning
                                ? t('team.low_progress_or_score', 'Low completion or low quiz scores')
                                : `${trackingSummary.overdueCount} ${t('team.overdue_short', 'overdue')} · ${trackingSummary.expiringCertCount} ${t('team.expiring_short', 'certs expiring')}`}
                        </p>
                        <p className="text-[11px] text-rose-500 mt-1 font-medium">
                            {atRiskOnly ? t('team.click_to_show_all', 'Click to show everyone') : t('team.click_to_filter', 'Click to filter the list below')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('common:search', 'Search...')}
                        className="ps-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    {atRiskOnly && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                            onClick={() => setAtRiskOnly(false)}
                        >
                            {t('team.clear_at_risk_filter', 'Clear at-risk filter')}
                        </Button>
                    )}
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
                            {atRiskOnly
                                ? t('team.no_at_risk', 'Nobody on your team currently needs follow-up.')
                                : searchTerm
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
                                        <Mail className="h-4 w-4 me-2 text-gray-400" />
                                        <span className="truncate" title={member.email}>{member.email}</span>
                                    </div>
                                    {member.phone && (
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Phone className="h-4 w-4 me-2 text-gray-400" />
                                            <span>{member.phone}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Users className="h-4 w-4 me-2 text-gray-400" />
                                        <span className="truncate">
                                            {member.department?.[0]?.departments?.name || t('team.no_department', 'No Department')}
                                        </span>
                                    </div>

                                    <div className="pt-3 border-t mt-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <BarChart3 className="h-3.5 w-3.5" />
                                                {t('team.learning_tracking', 'Learning Tracking')}
                                            </div>
                                            {trackingByUser[member.id]?.atRisk && (
                                                <Badge
                                                    variant="destructive"
                                                    className="text-[10px] px-2 py-0"
                                                    title={trackingByUser[member.id].atRiskReasons.map(r => AT_RISK_REASON_LABELS[r]).join(' · ')}
                                                >
                                                    {t('team.at_risk', 'At risk')}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="text-xs text-slate-600">
                                            {`${trackingByUser[member.id]?.completedModules || 0}/${trackingByUser[member.id]?.assignedModules || 0} ${t('team.modules', 'modules')}`}
                                        </div>
                                        <Progress value={trackingByUser[member.id]?.completionRate || 0} className="h-2" />

                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                            <span>{`${t('team.avg_score', 'Avg score')}: ${trackingByUser[member.id]?.avgScore ?? '-'}`}</span>
                                            <span>{`${t('team.certificates', 'Certificates')}: ${trackingByUser[member.id]?.certificatesCount || 0}`}</span>
                                        </div>
                                        {((trackingByUser[member.id]?.overdueCount ?? 0) > 0 || (trackingByUser[member.id]?.expiringCertCount ?? 0) > 0) && (
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                {(trackingByUser[member.id]?.overdueCount ?? 0) > 0 && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-rose-200 text-rose-700 bg-rose-50">
                                                        {`${trackingByUser[member.id].overdueCount} ${t('team.overdue_short', 'overdue')}`}
                                                    </Badge>
                                                )}
                                                {(trackingByUser[member.id]?.expiringCertCount ?? 0) > 0 && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-200 text-amber-700 bg-amber-50">
                                                        {`${trackingByUser[member.id].expiringCertCount} ${t('team.expiring_short', 'certs expiring')}`}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                        {trackingByUser[member.id]?.lastActivity && (
                                            <div className="text-[11px] text-slate-400">
                                                {`${t('team.last_activity', 'Last activity')}: ${new Date(trackingByUser[member.id].lastActivity as string).toLocaleDateString()}`}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-3 flex gap-2 border-t mt-3">
                                        <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                                            <Link to={`/profile/${member.id}`}>
                                                {t('common:view', 'View')}
                                            </Link>
                                        </Button>
                                        <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                                            <a href={member.email ? `mailto:${member.email}` : '#'} onClick={(e) => !member.email && e.preventDefault()}>
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
