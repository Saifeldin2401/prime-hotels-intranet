import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGoals, useCreateGoal, useUpdateGoal } from '@/hooks/useGoals'
import { Target, Plus, Calendar as CalendarIcon, CheckCircle2, Circle, Clock, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { ar, enUS } from 'date-fns/locale'

export default function MyGoals() {
    const { t, i18n } = useTranslation('hr')
    const dateLocale = i18n.language.startsWith('ar') ? ar : enUS
    const { user } = useAuth()
    const { data: goals, isLoading } = useGoals()
    const createGoalMutation = useCreateGoal()
    const updateGoalMutation = useUpdateGoal()

    const [isAddOpen, setIsAddOpen] = useState(false)
    const [newGoal, setNewGoal] = useState({
        title: '',
        description: '',
        target_date: '',
        category: 'performance'
    })

    const handleCreate = async () => {
        if (!user) return
        try {
            await createGoalMutation.mutateAsync({
                ...newGoal,
                employee_id: user.id,
                status: 'pending'
            })
            toast.success(t('career_goals.success_create'))
            setIsAddOpen(false)
            setNewGoal({ title: '', description: '', target_date: '', category: 'performance' })
        } catch (error) {
            toast.error(t('career_goals.error_create'))
        }
    }

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'completed' ? 'in_progress' : 'completed'
        try {
            await updateGoalMutation.mutateAsync({
                id,
                updates: { status: nextStatus as any }
            })
            toast.success(t('career_goals.success_update', { status: nextStatus.replace('_', ' ') }))
        } catch (error) {
            toast.error(t('career_goals.error_update'))
        }
    }

    const completedGoals = goals?.filter(g => g.status === 'completed')?.length || 0
    const totalGoals = goals?.length || 0
    const completionPercentage = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0

    return (
        <MotionWrapper>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('career_goals.title')}</h1>
                        <p className="text-muted-foreground">{t('career_goals.description')}</p>
                    </div>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                {t('career_goals.add_new_goal')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('career_goals.create_title')}</DialogTitle>
                                <DialogDescription>{t('career_goals.create_description')}</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="title">{t('career_goals.goal_title')}</Label>
                                    <Input
                                        id="title"
                                        placeholder={t('career_goals.goal_title_placeholder')}
                                        value={newGoal.title}
                                        onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">{t('career_goals.goal_desc')}</Label>
                                    <Textarea
                                        id="description"
                                        placeholder={t('career_goals.goal_desc_placeholder')}
                                        value={newGoal.description}
                                        onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="date">{t('career_goals.target_date')}</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={newGoal.target_date}
                                        onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>{t('career_goals.cancel')}</Button>
                                <Button onClick={handleCreate} disabled={createGoalMutation.isPending}>
                                    {createGoalMutation.isPending ? t('career_goals.creating') : t('career_goals.create')}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="md:col-span-1 shadow-lg border-primary/10 bg-hotel-navy text-white">
                        <CardHeader>
                            <CardTitle className="text-lg">{t('career_goals.stats_title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="text-center py-4">
                                <div className="text-4xl font-bold mb-1">{completedGoals}/{totalGoals}</div>
                                <div className="text-xs text-white/60">{t('career_goals.completed_label')}</div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span>{t('career_goals.overall_progress')}</span>
                                    <span>{Math.round(completionPercentage)}%</span>
                                </div>
                                <Progress value={completionPercentage} className="h-2 bg-white/10" />
                            </div>
                            <div className="pt-4 space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span>{completedGoals} {t('career_goals.completed')}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span>{goals?.filter(g => g.status === 'in_progress')?.length || 0} {t('career_goals.in_progress')}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                                    <span>{goals?.filter(g => g.status === 'pending')?.length || 0} {t('career_goals.pending')}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-3 shadow-lg border-primary/10">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>{t('career_goals.my_goals')}</CardTitle>
                                    <CardDescription>{t('career_goals.my_goals_desc')}</CardDescription>
                                </div>
                                <Target className="w-5 h-5 text-primary" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px] w-full pr-4">
                                {isLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {goals?.map((goal) => (
                                            <div
                                                key={goal.id}
                                                className={`p-4 rounded-xl border transition-all ${goal.status === 'completed' ? 'bg-muted/30 opacity-75' : 'bg-card'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="mt-1"
                                                        onClick={() => handleToggleStatus(goal.id, goal.status || '')}
                                                    >
                                                        {goal.status === 'completed' ? (
                                                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                                                        ) : (
                                                            <Circle className="w-6 h-6 text-muted-foreground" />
                                                        )}
                                                    </Button>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className={`font-semibold ${goal.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                                                {goal.title}
                                                            </h3>
                                                            <Badge variant="outline" className="text-[10px] uppercase">
                                                                {goal.category}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                                                        <div className="flex items-center gap-4 pt-2">
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <CalendarIcon className="w-3 h-3" />
                                                                <span>{t('career_goals.due')}: {goal.target_date ? format(new Date(goal.target_date), 'MMM d, yyyy', { locale: dateLocale }) : 'No date'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Clock className="w-3 h-3" />
                                                                <span>
                                                                    {t('career_goals.status')}: {
                                                                        goal.status === 'in_progress' ? t('career_goals.in_progress') :
                                                                            goal.status === 'completed' ? t('career_goals.completed') :
                                                                                goal.status === 'pending' ? t('career_goals.pending') :
                                                                                    goal.status?.replace('_', ' ')
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {goal.training_module && (
                                                            <div className="mt-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100 space-y-2">
                                                                <div className="flex justify-between items-center text-xs">
                                                                    <span className="font-medium text-blue-700 flex items-center gap-1">
                                                                        <BookOpen className="w-3 h-3" />
                                                                        {t('career_goals.linked_training')}: {goal.training_module.title}
                                                                    </span>
                                                                    <span className="font-bold text-blue-700">
                                                                        {goal.training_module.progress?.status === 'completed' ? '100%' : goal.training_module.progress?.status === 'in_progress' ? '50%' : '0%'}
                                                                    </span>
                                                                </div>
                                                                <Progress
                                                                    value={goal.training_module.progress?.status === 'completed' ? 100 : goal.training_module.progress?.status === 'in_progress' ? 50 : 0}
                                                                    className="h-1.5 bg-blue-100"
                                                                />
                                                                {goal.training_module.progress?.quiz_score !== null && (
                                                                    <p className="text-[10px] text-blue-600">
                                                                        {t('career_goals.quiz_score')}: {goal.training_module.progress.quiz_score}%
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {goals?.length === 0 && (
                                            <div className="text-center py-12">
                                                <Target className="w-12 h-12 text-muted/30 mx-auto mb-3" />
                                                <p className="text-muted-foreground">{t('career_goals.no_goals')}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MotionWrapper >
    )
}
