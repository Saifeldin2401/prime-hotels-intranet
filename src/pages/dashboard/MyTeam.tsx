import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Users,
    Search,
    UserCheck,
    Clock,
    GraduationCap,
    Calendar,
    ChevronRight,
    Mail,
    Phone,
    Briefcase,
    RefreshCw,
    TrendingUp,
    AlertCircle
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

interface TeamMember {
    id: string
    full_name: string
    email: string
    phone: string | null
    job_title: string | null
    avatar_url: string | null
    hire_date: string | null
    is_active: boolean
    pending_leave_count?: number
    pending_tasks_count?: number
    training_completion?: number
}

interface TeamStats {
    total: number
    active: number
    onLeave: number
    pendingRequests: number
    avgTrainingCompletion: number
}

export default function MyTeam() {
    const { t } = useTranslation(['dashboard', 'common'])
    const navigate = useNavigate()
    const { user } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState('overview')

    // Fetch direct reports
    const { data: teamMembers, isLoading: isLoadingTeam, refetch } = useQuery({
        queryKey: ['my-direct-reports', user?.id],
        queryFn: async () => {
            if (!user?.id) return []

            // Get direct reports
            const { data: reports, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone, job_title, avatar_url, hire_date, is_active')
                .eq('reporting_to', user.id)
                .eq('is_active', true)
                .order('full_name')

            if (error) throw error
            if (!reports || reports.length === 0) return []

            const reportIds = reports.map(r => r.id)

            // Fetch pending leave requests count for each report
            const { data: leaveData } = await supabase
                .from('leave_requests')
                .select('requester_id')
                .in('requester_id', reportIds)
                .eq('status', 'pending')

            // Fetch pending tasks count for each report
            const { data: taskData } = await supabase
                .from('tasks')
                .select('assigned_to_id')
                .in('assigned_to_id', reportIds)
                .eq('status', 'pending')

            // Fetch training completion (learning assignments)
            const { data: trainingData } = await supabase
                .from('learning_assignments')
                .select('user_id, status')
                .in('user_id', reportIds)

            // Merge data
            return reports.map(report => {
                const pendingLeave = leaveData?.filter(l => l.requester_id === report.id).length || 0
                const pendingTasks = taskData?.filter(t => t.assigned_to_id === report.id).length || 0
                const trainingAssignments = trainingData?.filter(t => t.user_id === report.id) || []
                const completedTraining = trainingAssignments.filter(t => t.status === 'completed').length
                const trainingCompletion = trainingAssignments.length > 0
                    ? Math.round((completedTraining / trainingAssignments.length) * 100)
                    : 100

                return {
                    ...report,
                    pending_leave_count: pendingLeave,
                    pending_tasks_count: pendingTasks,
                    training_completion: trainingCompletion
                } as TeamMember
            })
        },
        enabled: !!user?.id
    })

    // Calculate team stats
    const teamStats: TeamStats = {
        total: teamMembers?.length || 0,
        active: teamMembers?.filter(m => m.is_active).length || 0,
        onLeave: teamMembers?.filter(m => (m.pending_leave_count || 0) > 0).length || 0,
        pendingRequests: teamMembers?.reduce((sum, m) => sum + (m.pending_leave_count || 0), 0) || 0,
        avgTrainingCompletion: teamMembers?.length
            ? Math.round(teamMembers.reduce((sum, m) => sum + (m.training_completion || 0), 0) / teamMembers.length)
            : 0
    }

    // Filter team members by search
    const filteredMembers = teamMembers?.filter(member =>
        member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">{t('common:please_login', 'Please log in to view your team')}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('my_team.title', 'My Team')}
                description={t('my_team.description', 'View and manage your direct reports')}
                actions={
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4 me-2" />
                        {t('common:refresh', 'Refresh')}
                    </Button>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{teamStats.total}</p>
                                <p className="text-sm text-gray-500">{t('my_team.direct_reports', 'Direct Reports')}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{teamStats.active}</p>
                                <p className="text-sm text-gray-500">{t('my_team.active', 'Active')}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{teamStats.pendingRequests}</p>
                                <p className="text-sm text-gray-500">{t('my_team.pending_requests', 'Pending Requests')}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{teamStats.avgTrainingCompletion}%</p>
                                <p className="text-sm text-gray-500">{t('my_team.training_avg', 'Avg Training')}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Tabs */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder={t('my_team.search_team', 'Search team members...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Team List */}
            {isLoadingTeam ? (
                <Card>
                    <CardContent className="flex items-center justify-center py-12">
                        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                        {t('common:loading', 'Loading...')}
                    </CardContent>
                </Card>
            ) : filteredMembers.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Users className="h-12 w-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">
                            {teamMembers?.length === 0
                                ? t('my_team.no_reports', 'No direct reports')
                                : t('my_team.no_results', 'No team members found')}
                        </p>
                        <p className="text-sm">
                            {teamMembers?.length === 0
                                ? t('my_team.no_reports_desc', 'You dont have any employees reporting to you yet.')
                                : t('my_team.try_different_search', 'Try a different search term')}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredMembers.map((member) => (
                        <Card key={member.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={member.avatar_url || ''} />
                                        <AvatarFallback className="bg-primary text-white">
                                            {getInitials(member.full_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                            {member.full_name}
                                        </h3>
                                        <p className="text-sm text-gray-500 truncate">
                                            {member.job_title || t('common:no_title', 'No title')}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            {(member.pending_leave_count || 0) > 0 && (
                                                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                                                    <Clock className="h-3 w-3 me-1" />
                                                    {member.pending_leave_count} {t('my_team.pending', 'pending')}
                                                </Badge>
                                            )}
                                            {(member.training_completion || 0) < 80 && (
                                                <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                                                    <AlertCircle className="h-3 w-3 me-1" />
                                                    {member.training_completion}% {t('my_team.training', 'training')}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                        <a href={`mailto:${member.email}`} className="hover:text-primary">
                                            <Mail className="h-4 w-4" />
                                        </a>
                                        {member.phone && (
                                            <a href={`tel:${member.phone}`} className="hover:text-primary">
                                                <Phone className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate(`/profile/${member.id}`)}
                                    >
                                        {t('common:view_profile', 'View Profile')}
                                        <ChevronRight className="h-4 w-4 ms-1" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
