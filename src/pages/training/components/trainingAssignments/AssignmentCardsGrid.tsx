import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { BookOpen, CheckCircle2, Loader2, MapPin, Plus, Trash2, Users, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { LearningAssignment } from './types'

interface AssignmentGroup {
  key: string
  assignments: LearningAssignment[]
  latestCreatedAt: string
  moduleTitle: string
  priority: string
  dueDate: string | null
}

interface AssignmentTarget {
  assignmentId: string
  label: string
  meta: string | undefined
}

interface AssignmentCardsGridProps {
  groupedAssignments: AssignmentGroup[]
  isLoadingAssignments: boolean
  viewMode: 'grid' | 'list'
  isRTL: boolean
  hideCreateButton: boolean
  exemptionCountByModule: Map<string, number>
  getTargetDetails: (assignment: LearningAssignment) => { label: string; meta: string | undefined }
  getTargetIcon: (type: string) => React.ReactNode
  getTargetLabel: (type: string) => string
  formatDate: (dateStr: string) => string
  onDelete: (id: string) => void
  onManageAssignees: (moduleId: string, moduleTitle?: string) => void
  onCreateNew: () => void
}

export function AssignmentCardsGrid({
  groupedAssignments,
  isLoadingAssignments,
  viewMode,
  isRTL,
  hideCreateButton,
  exemptionCountByModule,
  getTargetDetails,
  getTargetIcon,
  getTargetLabel,
  formatDate,
  onDelete,
  onManageAssignees,
  onCreateNew,
}: AssignmentCardsGridProps) {
  const { t } = useTranslation('training')

  if (isLoadingAssignments) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-16">
        <div className="relative">
          <Loader2 className="w-10 h-10 animate-spin text-hotel-gold" />
          <div className="absolute inset-0 w-10 h-10 animate-ping rounded-full bg-hotel-gold/20" />
        </div>
        <p className="mt-4 text-sm text-slate-500">{t('loadingAssignments', 'Loading assignments...')}</p>
      </div>
    )
  }

  if (groupedAssignments.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-16 px-8">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center shadow-inner">
            <BookOpen className="w-12 h-12 text-slate-300" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shadow-sm">
            <Plus className="w-5 h-5 text-slate-400" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 text-center">{t('noAssignments')}</h3>
        <p className="mt-2 text-sm text-slate-500 text-center max-w-md">{t('startAssigning', 'Get started by creating your first training assignment.')}</p>
        {!hideCreateButton && (
          <Button onClick={onCreateNew} className="mt-6 bg-hotel-navy hover:bg-hotel-navy/90 text-white px-6 shadow-sm hover:shadow transition-all">
            <Plus className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
            {t('createAssignment')}
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      {groupedAssignments.map((group) => {
        const primaryAssignment = group.assignments[0]
        const targetType = primaryAssignment.target_type
        const targetTypeLabel = getTargetLabel(targetType)
        const exemptedCount = exemptionCountByModule.get(primaryAssignment.content_id) || 0
        const targets: AssignmentTarget[] = group.assignments.map((assignment) => ({
          assignmentId: assignment.id,
          ...getTargetDetails(assignment)
        }))

        return (
          <Card key={group.key} className="group overflow-hidden border-0 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <div className={cn(
              "h-1.5 w-full",
              primaryAssignment.priority === 'compliance' && "bg-gradient-to-r from-rose-500 to-rose-600",
              primaryAssignment.priority === 'high' && "bg-gradient-to-r from-amber-500 to-orange-500",
              (!primaryAssignment.priority || primaryAssignment.priority === 'normal') && "bg-gradient-to-r from-blue-500 to-indigo-500"
            )} />
            <div className="p-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-blue-200 bg-blue-50/80 text-blue-700 font-medium text-[11px] px-2 py-0.5">
                    <BookOpen className="w-3 h-3 mr-1" />
                    {t('module')}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-medium text-[11px] px-2 py-0.5",
                      primaryAssignment.priority === 'compliance' && "border-rose-200 bg-rose-50 text-rose-700",
                      primaryAssignment.priority === 'high' && "border-amber-200 bg-amber-50 text-amber-700",
                      (!primaryAssignment.priority || primaryAssignment.priority === 'normal') && "border-slate-200 bg-slate-50 text-slate-700"
                    )}
                  >
                    {t(primaryAssignment.priority || 'normal', primaryAssignment.priority || 'normal')}
                  </Badge>
                  {primaryAssignment.requires_acknowledgement && (
                    <Badge variant="outline" className="border-amber-300 bg-amber-100/50 text-amber-800 font-medium text-[11px] px-2 py-0.5">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {t('ackRequired', 'Ack required')}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {targets.length > 1 && (
                    <Badge variant="outline" className="bg-hotel-gold/10 text-hotel-navy border-hotel-gold/30 font-medium text-[11px]">
                      <Users className="w-3 h-3 mr-1" />
                      {targets.length} {t('targets', 'targets')}
                    </Badge>
                  )}
                  {exemptedCount > 0 && (
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-medium text-[11px]">
                      <X className="w-3 h-3 mr-1" />
                      {exemptedCount} {t('exempted', 'exempted')}
                    </Badge>
                  )}
                </div>
              </div>
              <h3 className="text-lg font-semibold mt-3 line-clamp-2 leading-snug text-slate-900" title={primaryAssignment.training_modules?.title}>
                {primaryAssignment.training_modules?.title || t('unknownModule')}
              </h3>
            </div>

            <div className="px-4 pb-4 pt-0">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  {targets.length === 1 ? (
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900 truncate">{targets[0].label}</div>
                        {targets[0].meta && targets[0].meta !== targets[0].label && (
                          <div className="text-xs text-slate-500 truncate">{targets[0].meta}</div>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 -mr-2"
                        onClick={() => onDelete(targets[0].assignmentId)}
                        aria-label={t('accessibility.deleteAssignment', 'Delete assignment')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500">{getTargetIcon(targetType)}</span>
                        <span className="text-slate-600">{targetTypeLabel}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 h-5 bg-slate-50">{targets.length}</Badge>
                      </div>
                      <div className="pl-6 space-y-1">
                        {targets.slice(0, 3).map((target) => (
                          <div key={target.assignmentId} className="flex items-start justify-between gap-2">
                            <div className="text-sm text-slate-900 truncate min-w-0 flex-1">{target.label}</div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 shrink-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 -mr-1"
                              onClick={() => onDelete(target.assignmentId)}
                              aria-label={t('accessibility.deleteAssignment', 'Delete assignment')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                        {targets.length > 3 && (
                          <div className="text-xs text-slate-500">+{targets.length - 3} {t('more', 'more')}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>{formatDate(primaryAssignment.created_at)}</span>
                  {primaryAssignment.due_date && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span className={cn("px-2 py-0.5 rounded-full", new Date(primaryAssignment.due_date) < new Date() ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700")}>
                        {t('due')}: {formatDate(primaryAssignment.due_date)}
                      </span>
                    </>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium h-9"
                  onClick={() => onManageAssignees(primaryAssignment.content_id, primaryAssignment.training_modules?.title)}
                >
                  <Users className={cn("h-4 w-4 text-slate-500", isRTL ? "ml-2" : "mr-2")} />
                  {t('manageAssignees', 'Manage assignees')}
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </>
  )
}
