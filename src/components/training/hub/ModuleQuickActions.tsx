import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Edit, Eye, Users, Copy, Trash2, MoreVertical, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface TrainingModule {
  id: string
  title: string
  status: string
}

interface ModuleQuickActionsProps {
  module: TrainingModule
  onEdit: () => void
  onView: () => void
  onAssign: () => void
  onClone: () => void
  onDelete: () => void
}

export function ModuleQuickActions({
  module,
  onEdit,
  onView,
  onAssign,
  onClone,
  onDelete
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
        <Edit className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
        {t('common:action.edit')}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn("w-full", isRTL ? "flex-row-reverse" : "")}>
            <MoreVertical className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('common:action.more')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isRTL ? 'start' : 'end'} className={cn(isRTL ? "text-right" : "text-left")}>
          <DropdownMenuItem onClick={onView} className={cn(isRTL ? "flex-row-reverse" : "")}>
            <Eye className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('common:action.view')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAssign} className={cn(isRTL ? "flex-row-reverse" : "")}>
            <Users className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('assign')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onClone} className={cn(isRTL ? "flex-row-reverse" : "")}>
            <Copy className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('clone')}
          </DropdownMenuItem>
          {module.status === 'published' && (
            <DropdownMenuItem onClick={onView} className={cn(isRTL ? "flex-row-reverse" : "")}>
              <Play className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {t('preview')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className={cn("text-red-600 focus:text-red-600", isRTL ? "flex-row-reverse" : "")}
          >
            <Trash2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('common:action.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

