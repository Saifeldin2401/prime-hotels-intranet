import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'
import { CalendarDays, CheckCircle2, ChevronDown, Megaphone, Plus, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

// Modal imports
import { QuickAnnouncementModal } from './modals/QuickAnnouncementModal'
import { QuickEventModal } from './modals/QuickEventModal'
import { QuickMaintenanceModal } from './modals/QuickMaintenanceModal'
import { QuickTaskModal } from './modals/QuickTaskModal'

type ModalType = 'task' | 'event' | 'maintenance' | 'announcement' | null

interface QuickCreateMenuProps {
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function QuickCreateMenu({
  className,
  variant = 'default',
  size = 'sm'
}: QuickCreateMenuProps) {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Use centralized permission system to check announcement access
  // This respects role hierarchy (e.g., corporate_admin inherits all lower-level permissions)
  const canPostAnnouncement = hasPermission('announcements.create')

  const menuItems = [
    {
      id: 'task' as const,
      label: t('quick_create.menu_task') || 'Quick Add Task',
      description: t('quick_create.menu_task_desc') || 'Create a new task',
      icon: CheckCircle2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      show: true,
    },
    {
      id: 'event' as const,
      label: t('quick_create.menu_event') || 'Quick Create Event',
      description: t('quick_create.menu_event_desc') || 'Add to calendar',
      icon: CalendarDays,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50',
      show: true,
    },
    {
      id: 'maintenance' as const,
      label: t('quick_create.menu_maintenance') || 'Report Maintenance',
      description: t('quick_create.menu_maintenance_desc') || 'Report an issue',
      icon: Wrench,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      show: true,
    },
    {
      id: 'announcement' as const,
      label: t('quick_create.menu_announcement') || 'Post Announcement',
      description: t('quick_create.menu_announcement_desc') || 'For managers/HR',
      icon: Megaphone,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      show: canPostAnnouncement,
    },
  ]

  const handleMenuItemClick = (itemId: typeof menuItems[number]['id']) => {
    setDropdownOpen(false)
    setActiveModal(itemId)
  }

  const handleModalClose = (open: boolean) => {
    if (!open) {
      setActiveModal(null)
    }
  }

  const visibleItems = menuItems.filter(item => item.show)

  if (!user) return null

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn(
              'gap-1.5 font-medium',
              variant === 'default' && 'bg-[#0B1C3E] hover:bg-[#1a3a6e]',
              className
            )}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('quick_create.button') || 'Quick Create'}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={isRTL ? 'start' : 'end'}
          className="w-64 z-[999]"
          sideOffset={8}
        >
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('quick_create.menu_title') || 'Create New'}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {visibleItems.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={() => handleMenuItemClick(item.id)}
              className="flex items-start gap-3 py-3 cursor-pointer"
            >
              <div className={cn(
                'p-2 rounded-lg shrink-0',
                item.bgColor
              )}>
                <item.icon className={cn('w-4 h-4', item.color)} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals */}
      <QuickTaskModal
        open={activeModal === 'task'}
        onOpenChange={handleModalClose}
      />
      <QuickEventModal
        open={activeModal === 'event'}
        onOpenChange={handleModalClose}
      />
      <QuickMaintenanceModal
        open={activeModal === 'maintenance'}
        onOpenChange={handleModalClose}
      />
      <QuickAnnouncementModal
        open={activeModal === 'announcement'}
        onOpenChange={handleModalClose}
      />
    </>
  )
}

// Export individual modals for direct usage
export { QuickAnnouncementModal } from './modals/QuickAnnouncementModal'
export { QuickEventModal } from './modals/QuickEventModal'
export { QuickMaintenanceModal } from './modals/QuickMaintenanceModal'
export { QuickTaskModal } from './modals/QuickTaskModal'
