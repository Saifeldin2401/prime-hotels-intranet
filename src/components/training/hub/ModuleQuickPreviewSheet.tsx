import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileQuestion,
  FileText,
  Film,
  GraduationCap,
  Headphones,
  HelpCircle,
  ImageIcon,
  Layers,
  Loader2,
  Sparkles,
  Users,
  Wand2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { TrainingCategoryBadge } from './TrainingCategoryBadge'

interface ModuleQuickPreviewSheetProps {
  moduleId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (moduleId: string) => void
  onView: (moduleId: string) => void
  onAssign: (moduleId: string) => void
}

interface ContentBlock {
  id: string
  title: string
  block_type: string
  is_mandatory?: boolean
  duration_seconds?: number
  points?: number
  content?: string
}

export function ModuleQuickPreviewSheet({
  moduleId,
  open,
  onOpenChange,
  onEdit,
  onView,
  onAssign
}: ModuleQuickPreviewSheetProps) {
  const { t, i18n } = useTranslation(['training', 'common'])
  const isRTL = i18n.dir() === 'rtl'

  // Fetch module details
  const { data: module, isLoading: moduleLoading } = useQuery({
    queryKey: ['training-module-preview', moduleId],
    queryFn: async () => {
      if (!moduleId) return null
      const { data, error } = await supabase
        .from('training_modules')
        .select('*')
        .eq('id', moduleId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!moduleId && open
  })

  // Fetch content blocks from documents
  const { data: blocks, isLoading: blocksLoading } = useQuery({
    queryKey: ['training-module-blocks-preview', moduleId],
    queryFn: async () => {
      if (!moduleId) return []
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, block_type, is_mandatory, duration_seconds, points, content')
        .eq('content_type', 'training_block')
        .eq('training_module_id', moduleId)
        .eq('is_deleted', false)
        .order('block_order', { ascending: true })
      if (error) throw error
      return (data || []) as ContentBlock[]
    },
    enabled: !!moduleId && open
  })

  // Fetch active assignment rules
  const { data: assignments } = useQuery({
    queryKey: ['training-module-assignments-preview', moduleId],
    queryFn: async () => {
      if (!moduleId) return []
      const { data, error } = await supabase
        .from('training_assignment_rules')
        .select('id, target_type, target_id, target_role, priority, valid_from')
        .eq('content_id', moduleId)
        .eq('content_type', 'module')
        .or('is_deleted.is.null,is_deleted.eq.false')
      if (error) throw error
      return data || []
    },
    enabled: !!moduleId && open
  })

  // Fetch completion progress stats
  const { data: progressStats } = useQuery({
    queryKey: ['training-module-progress-preview', moduleId],
    queryFn: async () => {
      if (!moduleId) return { total: 0, completed: 0, inProgress: 0 }
      const { data, error } = await supabase
        .from('training_progress')
        .select('status')
        .eq('training_id', moduleId)
      if (error) throw error
      const total = data?.length || 0
      const completed = data?.filter((p) => p.status === 'completed').length || 0
      const inProgress = data?.filter((p) => p.status === 'in_progress').length || 0
      return { total, completed, inProgress }
    },
    enabled: !!moduleId && open
  })

  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Film className="h-4 w-4 text-rose-500" />
      case 'quiz':
        return <FileQuestion className="h-4 w-4 text-purple-500" />
      case 'audio':
        return <Headphones className="h-4 w-4 text-emerald-500" />
      case 'image':
        return <ImageIcon className="h-4 w-4 text-sky-500" />
      case 'sop_reference':
        return <FileCheck className="h-4 w-4 text-amber-500" />
      default:
        return <FileText className="h-4 w-4 text-slate-500" />
    }
  }

  const isLoading = moduleLoading || blocksLoading

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isRTL ? 'left' : 'right'}
        className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col justify-between bg-white dark:bg-slate-950 shadow-2xl border-slate-200"
      >
        {isLoading || !module ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
            <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
            <p className="text-sm text-slate-500">{t('loading', 'Loading preview...')}</p>
          </div>
        ) : (
          <>
            {/* 1. Header with luxury gradient top strip */}
            <div className="relative border-b border-slate-100 dark:border-slate-800 pb-5 pt-6 px-6 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-hotel-navy via-hotel-gold to-amber-400" />
              
              <div className="flex flex-wrap items-center gap-2 mb-2 pt-1">
                <TrainingCategoryBadge category={module.category} size="sm" />
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] font-bold",
                    module.status === 'published'
                      ? 'bg-emerald-100 text-emerald-800'
                      : module.status === 'archived'
                      ? 'bg-rose-100 text-rose-800'
                      : module.status === 'pending_review'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  )}
                >
                  {t(module.status || 'draft')}
                </Badge>
                {module.difficulty_level && (
                  <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-200">
                    {module.difficulty_level}
                  </Badge>
                )}
                {module.certificate_enabled && (
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] gap-1 font-semibold">
                    <Award className="h-3 w-3 text-amber-600" />
                    {t('certificateEnabled', 'Certificate Enabled')}
                  </Badge>
                )}
              </div>

              <SheetTitle className="text-xl font-bold text-slate-900 dark:text-white font-serif leading-snug">
                {module.title}
              </SheetTitle>

              {module.description && (
                <SheetDescription className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-3 leading-relaxed">
                  {module.description}
                </SheetDescription>
              )}

              {/* Module Metadata Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-200/60 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{module.estimated_duration_minutes ? `${module.estimated_duration_minutes} ${t('min')}` : `0 ${t('min')}`}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                  <span>{blocks?.length || 0} {t('lessonsCount', { defaultValue: 'blocks' })}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span>{assignments?.length || 0} {t('rulesCount', { defaultValue: 'rules' })}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                  <span>{progressStats?.completed || 0} {t('completed', 'completed')}</span>
                </div>
              </div>
            </div>

            {/* 2. Scrollable Body: Syllabus & Rules */}
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-6">
                {/* Section A: Syllabus & Blocks */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-hotel-gold" />
                      {t('syllabusOutline', { defaultValue: 'Course Blueprint & Content' })}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {blocks?.length || 0} {t('units', { defaultValue: 'items' })}
                    </span>
                  </div>

                  {blocks && blocks.length > 0 ? (
                    <div className="space-y-2">
                      {blocks.map((block, idx) => (
                        <div
                          key={block.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-bold text-slate-400 w-4 text-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-100 shadow-2xs shrink-0">
                              {getBlockIcon(block.block_type)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {block.title || t('untitledBlock', { defaultValue: 'Content Block' })}
                              </p>
                              <span className="text-[10px] text-slate-400 capitalize">
                                {block.block_type.replace('_', ' ')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {block.is_mandatory && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50">
                                {t('mandatory', 'Mandatory')}
                              </Badge>
                            )}
                            {block.duration_seconds && block.duration_seconds > 0 && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                {Math.ceil(block.duration_seconds / 60)} {t('min')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center border border-dashed rounded-xl border-slate-200 bg-slate-50/30 text-slate-400 text-xs">
                      {t('noBlocksYet', { defaultValue: 'No content blocks added to this module yet.' })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Section B: Assignment Rules & Target Groups */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-blue-500" />
                      {t('assignmentTargeting', { defaultValue: 'Active Assignment Targets' })}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onOpenChange(false)
                        onAssign(module.id)
                      }}
                      className="h-6 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 font-semibold gap-1"
                    >
                      <Users className="h-3 w-3" />
                      {t('manageAssignments', 'Manage')}
                    </Button>
                  </div>

                  {assignments && assignments.length > 0 ? (
                    <div className="space-y-2">
                      {assignments.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-700 capitalize">
                              {rule.target_type}: {rule.target_role || rule.target_id || t('all', 'All')}
                            </span>
                          </div>
                          {rule.priority && (
                            <Badge variant="outline" className="text-[10px] font-normal capitalize">
                              {rule.priority}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center border border-dashed rounded-xl border-slate-200 text-slate-400 text-xs">
                      {t('notAssignedYet', { defaultValue: 'No auto-assign rules active for this module.' })}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* 3. Sticky Action Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  onView(module.id)
                }}
                className="gap-1.5 text-xs font-semibold"
              >
                <Eye className="h-3.5 w-3.5" />
                {t('launchPlayer', { defaultValue: 'Learner View' })}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false)
                    onAssign(module.id)
                  }}
                  className="gap-1.5 text-xs font-semibold text-hotel-navy border-hotel-navy/20 hover:bg-hotel-navy/5"
                >
                  <Users className="h-3.5 w-3.5" />
                  {t('assign', 'Assign')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    onOpenChange(false)
                    onEdit(module.id)
                  }}
                  className="gap-1.5 text-xs font-bold bg-hotel-gold hover:bg-hotel-gold-dark text-slate-950 shadow-sm"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {t('editInBuilder', { defaultValue: 'Open in Builder' })}
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
