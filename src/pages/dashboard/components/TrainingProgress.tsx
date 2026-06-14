import { PinButtonCompact } from '@/components/common/PinButton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useTrainingModules, useTrainingProgress } from '@/hooks/useTraining'
import { cn } from '@/lib/utils'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { ArrowRight, CheckCircle, Clock, GraduationCap, Play } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from "react-i18next"
import { Link } from 'react-router-dom'

const trainingSkeletonKeys = ['training-skeleton-1', 'training-skeleton-2', 'training-skeleton-3']

export function TrainingProgress() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation('dashboard');
  const { data: modulesData, isLoading } = useTrainingModules()
  const { data: progress } = useTrainingProgress(user?.id)

  const modules = useMemo(() => {
    const progressByTraining = new Map<string, number>(
      (progress || []).map((entry) => [entry.training_id, entry.progress_percentage || 0])
    )

    return (modulesData || []).slice(0, 5).map((module) => ({
      ...module,
      progress: progressByTraining.get(module.id) ?? 0
    }))
  }, [modulesData, progress])

  if (isLoading) {
    return (
      <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white p-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="space-y-4">
          {trainingSkeletonKeys.map((skeletonKey) => <Skeleton key={skeletonKey} className="h-16 w-full rounded-xl" />)}
        </div>
      </Card>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6 px-6 relative z-10 bg-white">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <GraduationCap className="w-5 h-5" />
              </div>
              <Link to="/learning/my" className="hover:text-emerald-600 transition-colors">
                {t('widgets.training_progress', 'Training Progress')}
              </Link>
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500 mt-1">
              {t('widgets.training_progress_desc', 'Continue your learning journey')}
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-slate-500 hover:text-slate-900 font-semibold h-8 rounded-full px-4 hover:bg-slate-100 transition-colors">
            <Link to="/learning/my">
              {t('widgets.all_courses', 'My Learning')} <ArrowRight className={cn("w-4 h-4", i18n.dir() === 'rtl' && "rotate-180")} />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-0 flex-1 relative bg-slate-50/30">
          <ScrollArea className="h-[340px] px-6 pb-6 pt-2">
            <div className="space-y-3">
              {modules?.length === 0 ? (
                <m.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 flex flex-col items-center justify-center h-full"
                >
                  <div className="w-16 h-16 bg-emerald-50/80 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-emerald-100/50 shadow-sm">
                    <GraduationCap className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-slate-800 font-bold text-lg">{t('widgets.no_active_courses', 'No active courses')}</p>
                  <p className="text-sm text-slate-500 font-medium mt-1 pe-4 ps-4">{t('widgets.browse_training', 'Browse available training to get started')}</p>
                </m.div>
              ) : (
                modules?.map((module, index: number) => {
                  const isCompleted = module.progress === 100;
                  const inProgress = module.progress > 0 && module.progress < 100;

                  return (
                    <m.div
                      key={module.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, ease: "easeOut" }}
                      className="group relative"
                    >
                      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_8px_rgb(0,0,0,0.02)] hover:border-slate-300 hover:shadow-[0_8px_16px_rgb(0,0,0,0.04)] transition-all ease-out hover:-translate-y-0.5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 pe-8">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-[15px] text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition-colors leading-tight">
                                {module.title}
                              </h4>
                            </div>
                            <p className="text-[13px] font-medium text-slate-500 line-clamp-1 leading-snug">
                              {module.description || t('widgets.training_module_desc', 'Comprehensive training module', { topic: module.title })}
                            </p>
                          </div>

                          <Link to={`/learning/training/${module.id}`} className="shrink-0">
                            <Button
                              size="sm"
                              variant={inProgress ? "outline" : "default"}
                              className={cn(
                                "flex-shrink-0 h-8 text-xs font-bold rounded-xl",
                                !inProgress && !isCompleted && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
                                isCompleted && "bg-slate-100 text-slate-700 hover:bg-slate-200 border-0"
                              )}
                            >
                              {inProgress ? t('action.continue', 'Continue') : isCompleted ? 'Review' : t('widgets.start', 'Start')}
                              <Play className={cn("w-3.5 h-3.5", i18n.dir() === 'rtl' ? "me-1.5" : "ms-1.5")} />
                            </Button>
                          </Link>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-xs font-bold">
                            {isCompleted ? (
                              <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> {t('common.status.completed', 'Done')}</span>
                            ) : inProgress ? (
                              <span className="text-blue-600 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {t('common.status.in_progress', 'In Progress')}</span>
                            ) : (
                              <span className="text-slate-500">{t('widgets.new', 'New')}</span>
                            )}
                            <span className="text-slate-600">{module.progress || 0}%</span>
                          </div>
                          <Progress
                            value={module.progress || 0}
                            className="h-1.5 bg-slate-100 rounded-full overflow-hidden"
                            indicatorClassName={cn(
                              "transition-all duration-500 ease-out",
                              isCompleted ? "bg-emerald-500" : inProgress ? "bg-blue-500" : "bg-slate-300"
                            )}
                          />
                        </div>
                      </div>
                      {/* Pin button */}
                      <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <PinButtonCompact
                          itemType="training"
                          itemId={module.id}
                          title={module.title}
                        />
                      </div>
                    </m.div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </LazyMotion>
  )
}
