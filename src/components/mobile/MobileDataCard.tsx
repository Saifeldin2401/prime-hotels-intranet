/**
 * MobileDataCard Component
 * 
 * Displays tabular data as cards on mobile devices for better UX.
 * Falls back to table view on larger screens.
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ChevronRight, MoreVertical } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface MobileDataCardField<T> {
  /** Unique key for the field */
  key: string
  /** Label to display */
  label: string
  /** Function to render the value */
  render: (item: T) => React.ReactNode
  /** Whether this field should be highlighted (shown in header) */
  isPrimary?: boolean
  /** Whether this is a secondary field (shown smaller) */
  isSecondary?: boolean
  /** Custom class for the value */
  className?: string
  /** Whether to hide on mobile card view */
  hideOnMobile?: boolean
}

export interface MobileDataCardAction<T> {
  /** Icon for the action */
  icon: React.ReactNode
  /** Label for accessibility */
  label: string
  /** Callback when clicked */
  onClick: (item: T) => void
  /** Condition to show the action */
  show?: (item: T) => boolean
  /** Variant for styling */
  variant?: 'default' | 'destructive' | 'outline' | 'ghost'
}

interface MobileDataCardProps<T> {
  /** Data items to display */
  items: T[]
  /** Field definitions */
  fields: MobileDataCardField<T>[]
  /** Unique key extractor */
  keyExtractor: (item: T) => string
  /** Optional actions for each card */
  actions?: MobileDataCardAction<T>[]
  /** Callback when card is clicked */
  onCardClick?: (item: T) => void
  /** Custom class for the container */
  className?: string
  /** Custom class for each card */
  cardClassName?: string
  /** Empty state message */
  emptyMessage?: string
  /** Loading state */
  isLoading?: boolean
  /** Number of skeleton cards to show when loading */
  skeletonCount?: number
  /** Whether to show a chevron indicating clickability */
  showChevron?: boolean
  /** Badge to show on each card */
  badge?: {
    render: (item: T) => React.ReactNode
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }
}

/**
 * MobileDataCard - Displays data as cards on mobile, table on desktop
 * 
 * Usage:
 * ```tsx
 * <MobileDataCard
 *   items={users}
 *   keyExtractor={(user) => user.id}
 *   fields={[
 *     { key: 'name', label: 'Name', render: (u) => u.name, isPrimary: true },
 *     { key: 'email', label: 'Email', render: (u) => u.email, isSecondary: true },
 *     { key: 'role', label: 'Role', render: (u) => u.role },
 *   ]}
 *   onCardClick={(user) => navigate(`/users/${user.id}`)}
 * />
 * ```
 */
export function MobileDataCard<T>({
  items,
  fields,
  keyExtractor,
  actions,
  onCardClick,
  className,
  cardClassName,
  emptyMessage = 'No items found',
  isLoading = false,
  skeletonCount = 3,
  showChevron = false,
  badge,
}: MobileDataCardProps<T>) {
  const { t } = useTranslation('common')
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const primaryField = fields.find((f) => f.isPrimary)
  const secondaryField = fields.find((f) => f.isSecondary)
  const detailFields = fields.filter((f) => !f.isPrimary && !f.hideOnMobile)

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-5 w-1/3 bg-muted rounded mb-3" />
              <div className="h-4 w-2/3 bg-muted rounded mb-2" />
              <div className="h-4 w-1/2 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-3 md:hidden', className)}>
      {items.map((item) => {
        const id = keyExtractor(item)
        const isExpanded = expandedCards.has(id)
        const visibleActions = actions?.filter((a) => !a.show || a.show(item))

        return (
          <Card
            key={id}
            className={cn(
              'overflow-hidden transition-all duration-200',
              onCardClick && 'cursor-pointer active:scale-[0.99]',
              cardClassName
            )}
            onClick={() => onCardClick?.(item)}
          >
            <CardHeader className="p-4 pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {primaryField && (
                    <h3 className="font-semibold text-base truncate">
                      {primaryField.render(item)}
                    </h3>
                  )}
                  {secondaryField && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {secondaryField.render(item)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {badge && (
                    <Badge variant={badge.variant || 'secondary'}>
                      {badge.render(item)}
                    </Badge>
                  )}
                  
                  {visibleActions && visibleActions.length > 0 && (
                    <div className="flex items-center gap-1">
                      {visibleActions.slice(0, 2).map((action, idx) => (
                        <Button
                          key={idx}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            action.onClick(item)
                          }}
                          aria-label={action.label}
                        >
                          {action.icon}
                        </Button>
                      ))}
                      {visibleActions.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleCard(id)
                          }}
                          aria-label={t('accessibility.moreActions', 'More actions')}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}

                  {showChevron && !actions && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-3">
              <dl className="space-y-2">
                {detailFields.map((field) => (
                  <div key={field.key} className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-muted-foreground shrink-0">{field.label}</dt>
                    <dd className={cn('text-sm font-medium text-right', field.className)}>
                      {field.render(item)}
                    </dd>
                  </div>
                ))}
              </dl>

              {/* Expanded actions */}
              {isExpanded && visibleActions && visibleActions.length > 2 && (
                <div className="mt-4 pt-3 border-t flex flex-wrap gap-2">
                  {visibleActions.slice(2).map((action, idx) => (
                    <Button
                      key={idx}
                      variant={action.variant || 'outline'}
                      size="sm"
                      className="flex-1 min-w-[80px]"
                      onClick={(e) => {
                        e.stopPropagation()
                        action.onClick(item)
                      }}
                    >
                      {action.icon}
                      <span className="ml-2">{action.label}</span>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

/**
 * MobileDataCardSkeleton - Loading skeleton for MobileDataCard
 */
export function MobileDataCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 md:hidden">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <div className="h-5 w-2/3 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded mt-2" />
              </div>
              <div className="h-6 w-16 bg-muted rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
