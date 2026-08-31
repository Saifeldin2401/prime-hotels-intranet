import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { CheckCircle2, Copy, Crown, Edit, Eye, MoreVertical, RefreshCw, SendHorizonal, Trash2, Users, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface TrainingModule {
  id: string
  title: string
}

interface ModuleQuickActionsProps {
  module: TrainingModule
  onEdit: () => void
  onView: () => void
  onAssign: () => void
  onClone: () => void
  onDelete: () => void
  onSubmitForReview?: () => void
  onApprove?: () => void
  onReject?: () => void
  onSyncWithMaster?: () => void
  isMaster?: boolean
  hasUpdate?: boolean
}

export function ModuleQuickActions({
  module,
  onEdit,
  onView,
  onAssign,
  onClone,
  onDelete,
  onSubmitForReview,
  onApprove,
  onReject,
  onSyncWithMaster,
  isMaster,
  hasUpdate
}: ModuleQuickActionsProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'

  return (
    <div className={cn("grid grid-cols-2 gap-2", isRTL ? "flex-row-reverse" : "")}>
      <Button
        variant="default"
        size="sm"
        onClick={onEdit}
        className={cn("bg-hotel-gold hover:bg-hotel-gold-dark", isRTL ? "flex-row-reverse" : "")}
      >
        <Edit className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
        {t('common:action.edit')}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn("w-full", isRTL ? "flex-row-reverse" : "")}>
            <MoreVertical className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
            {t('common:action.more')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isRTL ? 'start' : 'end'} className={cn(isRTL ? "text-right" : "text-left")}>
          <DropdownMenuItem onClick={onView} className={cn(isRTL ? "flex-row-reverse" : "")}>
            <Eye className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
            {t('common:action.view')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAssign} className={cn(isRTL ? "flex-row-reverse" : "")}>
            <Users className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
            {t('assign')}
          </DropdownMenuItem>

          {onSyncWithMaster && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onSyncWithMaster}
                className={cn(
                  hasUpdate ? "text-amber-700 font-bold focus:text-amber-700 bg-amber-50/50" : "text-indigo-700",
                  isRTL ? "flex-row-reverse" : ""
                )}
              >
                <RefreshCw className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2", hasUpdate ? "animate-spin" : "")} />
                {hasUpdate ? t('syncWithMaster', 'Sync with Master 🔔') : t('syncWithMaster', 'Sync with Master')}
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onClone} className={cn(isRTL ? "flex-row-reverse" : "")}>
            <Copy className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
            {t('clone')}
          </DropdownMenuItem>
          {(onSubmitForReview || onApprove || onReject) && <DropdownMenuSeparator />}
          {onSubmitForReview && (
            <DropdownMenuItem onClick={onSubmitForReview} className={cn(isRTL ? "flex-row-reverse" : "")}>
              <SendHorizonal className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
              {t('review.submitForReview')}
            </DropdownMenuItem>
          )}
          {onApprove && (
            <DropdownMenuItem onClick={onApprove} className={cn("text-green-700 focus:text-green-700", isRTL ? "flex-row-reverse" : "")}>
              <CheckCircle2 className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
              {t('review.approve')}
            </DropdownMenuItem>
          )}
          {onReject && (
            <DropdownMenuItem onClick={onReject} className={cn("text-amber-700 focus:text-amber-700", isRTL ? "flex-row-reverse" : "")}>
              <XCircle className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
              {t('review.reject')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className={cn("text-red-600 focus:text-red-600", isRTL ? "flex-row-reverse" : "")}
          >
            <Trash2 className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
            {t('common:action.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
