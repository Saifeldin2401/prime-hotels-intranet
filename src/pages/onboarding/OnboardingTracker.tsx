import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { OnboardingProcess } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Users, Sparkles, ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, ExternalLink, GraduationCap } from 'lucide-react'
import { useOnboardingTasks } from '@/hooks/useOnboarding'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AIOnboardingPathGenerator } from '@/components/onboarding/AIOnboardingPathGenerator'


function TaskDetailList({ processId }: { processId: string }) {
    const { data: tasks, isLoading } = useOnboardingTasks(processId)
    const { t } = useTranslation('onboarding')

    if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>

    if (!tasks || tasks.length === 0) return <div className="p-4 text-sm text-muted-foreground italic">No tasks found for this process.</div>

    return (
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                Journey Progress Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        className={cn(
                            "flex items-start gap-3 p-3 rounded-md bg-background border shadow-sm",
                            task.status === 'completed' && "border-green-100 bg-green-50/10"
                        )}
                    >
                        <div className="mt-0.5">
                            {task.status === 'completed' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : task.status === 'in_progress' ? (
                                <Clock className="h-4 w-4 text-blue-500" />
                            ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className={cn("text-sm font-medium truncate", task.status === 'completed' && "text-muted-foreground line-through")}>
                                    {task.title}
                                </p>
                                {task.link_type === 'training' && (
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-purple-100 text-purple-700 border-purple-200">
                                        <GraduationCap className="h-2.5 w-2.5 mr-1" />
                                        Training
                                    </Badge>
                                )}
                            </div>
                            {task.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {task.description}
                                </p>
                            )}
                        </div>
                        {task.link_type === 'training' && (
                            <Link
                                to={`/learning/training/${task.link_id}`}
                                className="text-muted-foreground hover:text-primary transition-colors"
                                title="View Training Module"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function OnboardingTracker() {
    const { t } = useTranslation('onboarding')
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedRows, setExpandedRows] = useState<string[]>([])

    const toggleRow = (id: string) => {
        setExpandedRows(prev =>
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        )
    }

    const { data: processes, isLoading } = useQuery({
        queryKey: ['onboarding', 'all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('onboarding_process')
                .select(`
          *,
          user:profiles!onboarding_process_user_id_fkey(*),
          template:onboarding_templates(title),
          tasks:onboarding_tasks(id, status)
        `)
                .order('start_date', { ascending: false })

            if (error) throw error
            return data as OnboardingProcess[]
        }
    })

    // Filter processes based on search
    const filteredProcesses = processes?.filter(p =>
        p.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.template?.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6 p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('tracker.title')}</h2>
                    <p className="text-muted-foreground">{t('tracker.subtitle')}</p>
                </div>
            </div>

            <Tabs defaultValue="tracker" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="tracker" className="gap-2">
                        <Users className="h-4 w-4" />
                        Active Onboardings
                    </TabsTrigger>
                    <TabsTrigger value="generator" className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        AI Path Generator
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="tracker">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>{t('tracker.active_processes')}</CardTitle>
                                <div className="relative w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t('tracker.search_placeholder')}
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10"></TableHead>
                                        <TableHead>{t('tracker.col_employee')}</TableHead>
                                        <TableHead>{t('tracker.col_template')}</TableHead>
                                        <TableHead>{t('tracker.col_started')}</TableHead>
                                        <TableHead>{t('tracker.col_status')}</TableHead>
                                        <TableHead className="w-[300px]">{t('tracker.col_progress')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProcesses?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                {t('tracker.no_data')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredProcesses?.map((process) => {
                                            // Handle progress calculation if DB value is missing or stale
                                            const totalTasks = process.tasks?.length || 0
                                            const completedTasks = process.tasks?.filter(t => t.status === 'completed').length || 0
                                            const displayProgress = totalTasks > 0
                                                ? Math.round((completedTasks / totalTasks) * 100)
                                                : process.progress_percent || 0

                                            return (
                                                <React.Fragment key={process.id}>
                                                    <TableRow
                                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                        onClick={() => toggleRow(process.id)}
                                                    >
                                                        <TableCell>
                                                            {expandedRows.includes(process.id) ? (
                                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={process.user?.avatar_url || ''} />
                                                                    <AvatarFallback>{process.user?.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                                <span>{process.user?.full_name}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{process.template?.title}</TableCell>
                                                        <TableCell>{format(new Date(process.start_date), 'MMM d, yyyy')}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={(process.status as string) === 'completed' ? 'secondary' : 'default'}>
                                                                {t(`status.${process.status}`)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Progress value={displayProgress} className="h-2" />
                                                                <span className="text-sm text-muted-foreground w-12 text-right">
                                                                    {displayProgress}%
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                    {expandedRows.includes(process.id) && (
                                                        <TableRow className="bg-muted/10">
                                                            <TableCell colSpan={6} className="p-4">
                                                                <TaskDetailList processId={process.id} />
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </React.Fragment>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="generator">
                    <AIOnboardingPathGenerator />
                </TabsContent>
            </Tabs>
        </div>
    )
}
