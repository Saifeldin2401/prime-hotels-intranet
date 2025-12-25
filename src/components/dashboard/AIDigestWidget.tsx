/**
 * AIDigestWidget - AI-Generated Manager Insights
 * 
 * Displays the latest AI-generated summary of key metrics and insights
 * for managers and department heads.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Sparkles,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Users,
    BookOpen,
    Wrench,
    ChevronRight,
    BrainCircuit
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'
import { formatDistanceToNow } from 'date-fns'

interface DigestData {
    id: string
    summary_text: string
    metrics: {
        training_completed?: number
        training_overdue?: number
        training_upcoming?: number
        pending_approvals?: number
        open_tickets?: number
        resolved_tickets?: number
        completion_rate?: number
        completion_trend?: 'up' | 'down' | 'stable'
    }
    period_start: string
    period_end: string
    created_at: string
}

interface AIDigestWidgetProps {
    className?: string
}

export function AIDigestWidget({ className }: AIDigestWidgetProps) {
    const { user } = useAuth()
    const { toast } = useToast()
    const [digest, setDigest] = useState<DigestData | null>(null)
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)

    // Fetch latest digest
    const fetchDigest = async () => {
        if (!user?.id) return

        try {
            const { data, error } = await supabase
                .from('ai_manager_digests')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching digest:', error)
            }

            setDigest(data || null)
        } catch (err) {
            console.error('Digest fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDigest()
    }, [user?.id])

    // Generate new digest on-demand
    const generateDigest = async () => {
        if (!user?.id) return

        setGenerating(true)
        try {
            // Fetch current metrics
            const now = new Date()
            const oneWeekAgo = new Date(now)
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

            // Get training stats
            const { count: completedCount } = await supabase
                .from('learning_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed')
                .gte('completed_at', oneWeekAgo.toISOString())

            const { count: overdueCount } = await supabase
                .from('learning_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'overdue')

            const { count: upcomingCount } = await supabase
                .from('learning_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'assigned')
                .gt('due_date', now.toISOString())

            // Get pending approvals
            const { count: pendingApprovals } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'PENDING_REVIEW')

            // Get maintenance stats
            const { count: openTickets } = await supabase
                .from('maintenance_tickets')
                .select('*', { count: 'exact', head: true })
                .in('status', ['open', 'in_progress'])

            const { count: resolvedTickets } = await supabase
                .from('maintenance_tickets')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'resolved')
                .gte('resolved_at', oneWeekAgo.toISOString())

            const metrics = {
                training_completed: completedCount || 0,
                training_overdue: overdueCount || 0,
                training_upcoming: upcomingCount || 0,
                pending_approvals: pendingApprovals || 0,
                open_tickets: openTickets || 0,
                resolved_tickets: resolvedTickets || 0,
                completion_rate: completedCount && (completedCount + (overdueCount || 0)) > 0
                    ? Math.round((completedCount / (completedCount + (overdueCount || 0))) * 100)
                    : 0
            }

            // Generate AI summary
            const prompt = `You are an executive assistant for a hotel chain. Generate a brief, professional weekly digest summary for a manager based on these metrics:

METRICS:
- Training Completed This Week: ${metrics.training_completed}
- Overdue Training Assignments: ${metrics.training_overdue}
- Upcoming Training Due: ${metrics.training_upcoming}
- Documents Pending Review: ${metrics.pending_approvals}
- Open Maintenance Tickets: ${metrics.open_tickets}
- Resolved Tickets This Week: ${metrics.resolved_tickets}
- Training Completion Rate: ${metrics.completion_rate}%

INSTRUCTIONS:
1. Write a 3-4 sentence professional summary highlighting key insights
2. Call out any concerns (high overdue, low completion rate)
3. Mention positive achievements if any
4. Be concise and actionable
5. Use a warm but professional tone

EXAMPLE OUTPUT:
"This week shows solid progress with ${metrics.training_completed} training completions. However, ${metrics.training_overdue} overdue assignments need attention. Consider following up with team members who have pending training. On the maintenance front, ${metrics.resolved_tickets} tickets were resolved efficiently."

Generate the summary now:`

            const { data: aiResult, error: aiError } = await supabase.functions.invoke('process-ai-request', {
                body: { prompt, model: 'Qwen/Qwen2.5-7B-Instruct' }
            })

            if (aiError) throw aiError

            const summaryText = aiResult?.result || `Weekly Summary: ${metrics.training_completed} training completions, ${metrics.training_overdue} overdue. ${metrics.pending_approvals} documents pending review. ${metrics.open_tickets} open maintenance tickets.`

            // Save digest
            const { data: newDigest, error: insertError } = await supabase
                .from('ai_manager_digests')
                .upsert({
                    user_id: user.id,
                    digest_type: 'weekly',
                    summary_text: summaryText,
                    metrics,
                    period_start: oneWeekAgo.toISOString(),
                    period_end: now.toISOString()
                }, {
                    onConflict: 'user_id,digest_type,period_start'
                })
                .select()
                .single()

            if (insertError) throw insertError

            setDigest(newDigest)
            toast({
                title: 'Digest Generated',
                description: 'Your weekly insights have been updated.',
            })

        } catch (err: any) {
            console.error('Digest generation error:', err)
            toast({
                title: 'Generation Failed',
                description: err.message || 'Could not generate digest',
                variant: 'destructive'
            })
        } finally {
            setGenerating(false)
        }
    }

    if (loading) {
        return (
            <Card className={cn("", className)}>
                <CardHeader className="pb-3">
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={cn("relative overflow-hidden", className)}>
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-blue-500/5" />

            <CardHeader className="pb-3 relative">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <BrainCircuit className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold">AI Insights</CardTitle>
                            {digest && (
                                <p className="text-xs text-muted-foreground">
                                    Updated {formatDistanceToNow(new Date(digest.created_at), { addSuffix: true })}
                                </p>
                            )}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateDigest}
                        disabled={generating}
                        className="gap-2"
                    >
                        <RefreshCw className={cn("h-4 w-4", generating && "animate-spin")} />
                        {generating ? 'Generating...' : 'Refresh'}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="relative">
                <AnimatePresence mode="wait">
                    {digest ? (
                        <motion.div
                            key="digest"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            {/* Summary Text */}
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {digest.summary_text}
                            </p>

                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                <MetricCard
                                    icon={BookOpen}
                                    label="Completed"
                                    value={digest.metrics.training_completed || 0}
                                    color="text-green-600"
                                    bgColor="bg-green-50"
                                />
                                <MetricCard
                                    icon={AlertTriangle}
                                    label="Overdue"
                                    value={digest.metrics.training_overdue || 0}
                                    color="text-amber-600"
                                    bgColor="bg-amber-50"
                                    alert={digest.metrics.training_overdue && digest.metrics.training_overdue > 0}
                                />
                                <MetricCard
                                    icon={Clock}
                                    label="Pending Review"
                                    value={digest.metrics.pending_approvals || 0}
                                    color="text-blue-600"
                                    bgColor="bg-blue-50"
                                />
                                <MetricCard
                                    icon={Wrench}
                                    label="Open Tickets"
                                    value={digest.metrics.open_tickets || 0}
                                    color="text-purple-600"
                                    bgColor="bg-purple-50"
                                />
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-8"
                        >
                            <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground mb-4">
                                No insights generated yet
                            </p>
                            <Button onClick={generateDigest} disabled={generating} className="gap-2">
                                <Sparkles className="h-4 w-4" />
                                Generate Weekly Insights
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    )
}

// Sub-component for metric cards
function MetricCard({
    icon: Icon,
    label,
    value,
    color,
    bgColor,
    alert
}: {
    icon: any
    label: string
    value: number
    color: string
    bgColor: string
    alert?: boolean
}) {
    return (
        <div className={cn(
            "rounded-xl p-3 transition-all",
            bgColor,
            alert && "ring-2 ring-amber-300 ring-offset-1"
        )}>
            <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("h-4 w-4", color)} />
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
            </div>
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
        </div>
    )
}
