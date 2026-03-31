/**
 * DataTableMobile Component
 * 
 * Mobile-optimized card view for DataTable.
 * Displays table data as interactive cards on mobile devices.
 */

import { Badge, BadgeProps } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
    Cell,
    ColumnDef,
    flexRender,
    Header,
    Row,
} from '@tanstack/react-table'
import { ChevronRight, MoreVertical } from 'lucide-react'
import { useState } from 'react'

export interface MobileCardConfig<TData> {
  /** Primary field accessor or custom render */
  primary: keyof TData | ((row: TData) => React.ReactNode)
  /** Secondary field accessor or custom render */
  secondary?: keyof TData | ((row: TData) => React.ReactNode)
  /** Fields to display in the card body */
  details?: Array<{
    /** Column accessor */
    accessor: keyof TData
    /** Custom label (defaults to column header) */
    label?: string
    /** Custom render function */
    render?: (row: TData) => React.ReactNode
  }>
  /** Badge configuration */
  badge?: {
    /** Accessor for badge content */
    accessor: keyof TData
    /** Variant for badge styling */
    variant?: BadgeProps['variant'] | ((value: unknown) => BadgeProps['variant'])
  }
  /** Show chevron indicator */
  showChevron?: boolean
}

interface DataTableMobileProps<TData> {
  /** Table rows */
  rows: Row<TData>[]
  /** Column definitions */
  columns: ColumnDef<TData, unknown>[]
  /** Card configuration */
  cardConfig: MobileCardConfig<TData>
  /** Row click handler */
  onRowClick?: (row: TData) => void
  /** Loading state */
  isLoading?: boolean
  /** Number of skeleton cards */
  skeletonCount?: number
  /** Empty state message */
  emptyMessage?: string
  /** Custom class */
  className?: string
}

/**
 * DataTableMobile - Mobile card view for table data
 */
export function DataTableMobile<TData>({
  rows,
  columns,
  cardConfig,
  onRowClick,
  isLoading = false,
  skeletonCount = 3,
  emptyMessage = 'No items found',
  className,
}: DataTableMobileProps<TData>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Helper to get value from row
  const getValue = (row: TData, accessor: keyof TData | ((row: TData) => React.ReactNode)) => {
    if (typeof accessor === 'function') {
      return accessor(row)
    }
    return row[accessor] as React.ReactNode
  }

  // Get column header
  const getColumnHeader = (accessor: keyof TData) => {
    const column = columns.find((col) => {
      const colAccessor = (col as { accessorKey?: string }).accessorKey
      return colAccessor === accessor
    })
    
    if (!column) return String(accessor)
    
    const header = column.header
    if (typeof header === 'string') return header
    if (typeof header === 'function') {
      // Try to extract header content
      return String(accessor)
    }
    return String(accessor)
  }

  // Loading skeleton
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

  // Empty state
  if (rows.length === 0) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-3 md:hidden', className)}>
      {rows.map((row) => {
        const data = row.original
        const rowId = row.id
        const isExpanded = expandedRows.has(rowId)

        // Primary content
        const primaryContent = getValue(data, cardConfig.primary)

        // Secondary content
        const secondaryContent = cardConfig.secondary
          ? getValue(data, cardConfig.secondary)
          : null

        // Badge content
        const badgeValue = cardConfig.badge
          ? getValue(data, cardConfig.badge.accessor)
          : null

        const badgeVariant = typeof cardConfig.badge?.variant === 'function'
          ? cardConfig.badge.variant(badgeValue)
          : cardConfig.badge?.variant || 'secondary'

        return (
          <Card
            key={rowId}
            className={cn(
              'overflow-hidden transition-all duration-200',
              onRowClick && 'cursor-pointer active:scale-[0.99]',
              isExpanded && 'ring-2 ring-primary/20'
            )}
            onClick={() => onRowClick?.(data)}
          >
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">
                    {primaryContent}
                  </h3>
                  {secondaryContent && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {secondaryContent}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {badgeValue && (
                    <Badge variant={badgeVariant}>
                      {badgeValue}
                    </Badge>
                  )}

                  {cardConfig.showChevron && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}

                  {/* Expand button if details exist */}
                  {cardConfig.details && cardConfig.details.length > 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpanded(rowId)
                      }}
                      className="p-1 rounded-md hover:bg-muted"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* Details */}
              {cardConfig.details && cardConfig.details.length > 0 && (
                <dl className="mt-3 pt-3 border-t space-y-2">
                  {(isExpanded
                    ? cardConfig.details
                    : cardConfig.details.slice(0, 2)
                  ).map((detail, idx) => {
                    const value = detail.render
                      ? detail.render(data)
                      : getValue(data, detail.accessor)
                    const label = detail.label || getColumnHeader(detail.accessor)

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-4"
                      >
                        <dt className="text-sm text-muted-foreground shrink-0">
                          {label}
                        </dt>
                        <dd className="text-sm font-medium text-right truncate">
                          {value}
                        </dd>
                      </div>
                    )
                  })}

                  {/* Show more indicator */}
                  {!isExpanded && cardConfig.details.length > 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpanded(rowId)
                      }}
                      className="text-xs text-primary font-medium pt-1"
                    >
                      +{cardConfig.details.length - 2} more
                    </button>
                  )}
                </dl>
              )}

              {/* Render remaining cells if no details config */}
              {!cardConfig.details && (
                <dl className="mt-3 pt-3 border-t space-y-2">
                  {row.getVisibleCells().slice(2).map((cell) => (
                    <div
                      key={cell.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <dt className="text-sm text-muted-foreground shrink-0">
                        {flexRender(
                          cell.column.columnDef.header,
                          cell.getContext()
                        )}
                      </dt>
                      <dd className="text-sm font-medium text-right">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
