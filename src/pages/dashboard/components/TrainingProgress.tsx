import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GraduationCap, ArrowRight, Play, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTrainingModules, useTrainingProgress } from '@/hooks/useTraining'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from "react-i18next";
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export function TrainingProgress() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation('dashboard');
  const { data: modulesData, isLoading } = useTrainingModules()
  const { data: progress } = useTrainingProgress(user?.id)
  const modules = useMemo(() => {
    const progressByTraining = new Map<string, number>(
      (progress || []).map((entry: any) => [entry.training_id, entry.progress_percentage || 0])
    )

    return (modulesData || []).slice(0, 5).map((module: any) => ({
      ...module,
      progress: progressByTraining.get(module.id) ?? 0
    }))
  }, [modulesData, progress])

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full border-0 shadow-lg bg-gradient-to-b from-white to-slate-50/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link to="/learning/my" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <GraduationCap className="w-5 h-5 text-emerald-500" />
              {t('widgets.training_progress', 'Training Progress')}
            </Link>
          </CardTitle>
          <CardDescription>{t('widgets.training_progress_desc', 'Continue your learning journey')}</CardDescription>
        </div>
        <Link to="/learning/my">
          <Button variant="ghost" size="sm" className="gap-1">
            {t('widgets.all_courses', 'My Learning')} <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px]">
          <div className="space-y-4 pr-4">
            {modules?.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <GraduationCap className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-muted-foreground font-medium">{t('widgets.no_active_courses', 'No active courses')}</p>
                <p className="text-sm text-muted-foreground">{t('widgets.browse_training', 'Browse available training')}</p>
              </div>
            ) : (
              modules?.map((module: any, index: number) => (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-xl border border-slate-100 bg-white hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                          {module.title}
                        </h4>
                        {module.progress === 100 ? (
                          <Badge variant="default" className="bg-emerald-500 text-[10px] h-5">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {t('common.status.completed', 'Done')}
                          </Badge>
                        ) : module.progress > 0 ? (
                          <Badge variant="outline" className="text-[10px] h-5">
                            <Clock className="w-3 h-3 mr-1" />
                            {t('common.status.in_progress', 'In Progress')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] h-5">{t('widgets.new', 'New')}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {module.description || t('widgets.training_module_desc', 'Comprehensive training module', { topic: module.title })}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <Progress value={module.progress || 0} className="h-2 flex-1" />
                        <span className="text-xs font-medium w-8 text-right">{module.progress || 0}%</span>
                      </div>
                    </div>
                    <Link to={`/learning/training/${module.id}`}>
                      <Button 
                        size="sm" 
                        variant={module.progress > 0 ? "outline" : "default"}
                        className="flex-shrink-0"
                      >
                        {module.progress > 0 ? t('action.continue', 'Continue') : t('widgets.start', 'Start')}
                        <Play className={cn("w-3 h-3", i18n.dir() === 'rtl' ? "mr-1" : "ml-1")} />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
