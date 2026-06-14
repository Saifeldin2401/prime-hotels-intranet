/**
 * PinnedItemsWidget Component
 * 
 * Dashboard widget that displays user's pinned items for quick access.
 * Shows up to 6 items in a grid with the ability to view all.
 * Supports removing pins directly from the widget.
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import type { PinItemType, PinWithDetails } from '@/hooks/usePins'
import { MAX_PINS, usePins, useRemovePin } from '@/hooks/usePins'
import { cn } from '@/lib/utils'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import {
    ArrowRight,
    Bell,
    Book,
    CheckSquare,
    FileText,
    GraduationCap,
    Pin,
    Star,
    X
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from "react-i18next"
import { Link } from 'react-router-dom'

// Icon mapping for each item type
const itemTypeConfig: Record<PinItemType, { icon: typeof FileText; color: string; label: string }> = {
  document: { icon: FileText, color: 'text-blue-500 bg-blue-50 border-blue-100', label: 'Document' },
  sop: { icon: FileText, color: 'text-indigo-500 bg-indigo-50 border-indigo-100', label: 'SOP' },
  training: { icon: GraduationCap, color: 'text-emerald-500 bg-emerald-50 border-emerald-100', label: 'Training' },
  task: { icon: CheckSquare, color: 'text-violet-500 bg-violet-50 border-violet-100', label: 'Task' },
  announcement: { icon: Bell, color: 'text-amber-500 bg-amber-50 border-amber-100', label: 'Announcement' },
  knowledge: { icon: Book, color: 'text-cyan-500 bg-cyan-50 border-cyan-100', label: 'Knowledge' },
}

interface PinnedItemCardProps {
  item: PinWithDetails
  onRemove: () => void
  isRTL: boolean
}

function PinnedItemCard({ item, onRemove, isRTL }: PinnedItemCardProps) {
  const config = itemTypeConfig[item.item_type]
  const Icon = config.icon
  const { t } = useTranslation('dashboard')

  return (
    <m.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -2 }}
      className="group relative"
    >
      <Link
        to={item.url}
        className={cn(
          "flex flex-col p-3 rounded-xl border bg-white shadow-sm",
          "hover:shadow-md hover:border-slate-200 transition-all duration-200",
          "h-full min-h-[100px]"
        )}
      >
        {/* Remove button - appears on hover */}
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            "absolute -top-2 -end-2 h-6 w-6 rounded-full bg-white border shadow-sm",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "text-slate-400 hover:text-red-500 hover:border-red-200 z-10"
          )}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove()
          }}
          aria-label={t('pins.actions.unpin', 'Unpin')}
        >
          <X className="h-3 w-3" />
        </Button>

        {/* Icon */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center mb-2 border",
          config.color
        )}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Title */}
        <h4 className={cn(
          "font-semibold text-sm text-slate-800 line-clamp-2 leading-tight flex-1",
          isRTL && "text-right"
        )}>
          {item.title}
        </h4>

        {/* Type Badge */}
        <Badge 
          variant="outline" 
          className={cn(
            "mt-2 text-[10px] uppercase tracking-wider font-bold w-fit",
            isRTL && "self-end"
          )}
        >
          {t(`pins.types.${item.item_type}`, config.label)}
        </Badge>
      </Link>
    </m.div>
  )
}

interface PinnedItemListItemProps {
  item: PinWithDetails
  onRemove: () => void
  isRTL: boolean
}

function PinnedItemListItem({ item, onRemove, isRTL }: PinnedItemListItemProps) {
  const config = itemTypeConfig[item.item_type]
  const Icon = config.icon
  const { t } = useTranslation('dashboard')

  return (
    <m.div
      layout
      initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
      className="group"
    >
      <Link
        to={item.url}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl border bg-white",
          "hover:bg-slate-50 hover:border-slate-200 transition-all duration-200"
        )}
      >
        {/* Icon */}
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
          config.color
        )}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-semibold text-sm text-slate-800 truncate",
            isRTL && "text-right"
          )}>
            {item.title}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(`pins.types.${item.item_type}`, config.label)}
          </p>
        </div>

        {/* Remove button */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8 rounded-full text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove()
          }}
          aria-label={t('pins.actions.unpin', 'Unpin')}
        >
          <X className="h-4 w-4" />
        </Button>
      </Link>
    </m.div>
  )
}

export function PinnedItemsWidget() {
  const { data: pins, isLoading } = usePins()
  const removePin = useRemovePin()
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const [showAllDialog, setShowAllDialog] = useState(false)

  const displayedPins = pins?.slice(0, 6) || []
  const hasMorePins = (pins?.length || 0) > 6
  const totalPins = pins?.length || 0

  const handleRemove = async (item: PinWithDetails) => {
    try {
      await removePin.mutateAsync({
        itemType: item.item_type,
        itemId: item.item_id
      })
    } catch {
      // Error handled by mutation
    }
  }

  if (isLoading) {
    return (
      <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white p-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" />
          ))}
        </div>
      </Card>
    )
  }

  // Empty state
  if (!pins || pins.length === 0) {
    return (
      <LazyMotion features={domAnimation}>
        <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
          <CardHeader className="pb-4 pt-6 px-6 bg-white border-b border-slate-100/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg">
                    <Pin className="w-5 h-5" />
                  </div>
                  {t('widgets.pinned_items', 'Pinned Items')}
                </CardTitle>
                <CardDescription className="text-sm font-medium text-slate-500 mt-1">
                  {t('widgets.pinned_items_desc', 'Quick access to important items')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8 flex flex-col items-center justify-center"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-slate-100 shadow-sm">
                <Star className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-800 font-bold text-lg">
                {t('pins.empty.title', 'No pinned items yet')}
              </p>
              <p className="text-sm text-slate-500 font-medium mt-1 max-w-xs">
                {t('pins.empty.description', 'Pin important documents, tasks, training, and announcements for quick access from your dashboard.')}
              </p>
              <div className="mt-4 text-xs text-slate-400">
                {t('pins.empty.limit_info', 'You can pin up to {{max}} items', { max: MAX_PINS })}
              </div>
            </m.div>
          </CardContent>
        </Card>
      </LazyMotion>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col">
        <CardHeader className="pb-4 pt-6 px-6 bg-white border-b border-slate-100/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg">
                  <Pin className="w-5 h-5" />
                </div>
                {t('widgets.pinned_items', 'Pinned Items')}
                <Badge variant="secondary" className="text-xs font-bold">
                  {totalPins}/{MAX_PINS}
                </Badge>
              </CardTitle>
              <CardDescription className="text-sm font-medium text-slate-500 mt-1">
                {t('widgets.pinned_items_desc', 'Quick access to important items')}
              </CardDescription>
            </div>
            {hasMorePins && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1 text-slate-500 hover:text-slate-900 font-semibold h-8 rounded-full px-4 hover:bg-slate-100 transition-colors"
                onClick={() => setShowAllDialog(true)}
              >
                {t('actions.view_all', 'View All')} 
                <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {displayedPins.map((item) => (
                <PinnedItemCard
                  key={`${item.item_type}-${item.item_id}`}
                  item={item}
                  onRemove={() => handleRemove(item)}
                  isRTL={isRTL}
                />
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* View All Dialog */}
      <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
        <DialogContent className={cn("max-w-lg max-h-[80vh]", isRTL && "rtl")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pin className="w-5 h-5 text-amber-500" />
              {t('pins.dialog.title', 'All Pinned Items')}
              <Badge variant="secondary" className="text-xs">
                {totalPins}/{MAX_PINS}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {t('pins.dialog.description', 'Manage your pinned items for quick access')}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[50vh] pe-4">
            <div className="space-y-2 py-2">
              <AnimatePresence mode="popLayout">
                {pins?.map((item) => (
                  <PinnedItemListItem
                    key={`${item.item_type}-${item.item_id}`}
                    item={item}
                    onRemove={() => handleRemove(item)}
                    isRTL={isRTL}
                  />
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </LazyMotion>
  )
}
