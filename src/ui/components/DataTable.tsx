import React, { useMemo, useState } from 'react'
import { ArrowDownUp, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface Column<T> {
  key: string
  header: string
  render: (item: T) => React.ReactNode
  className?: string
  mobileLabel?: string
  /** Opt in to local sorting. Use server-side sorting for paginated datasets. */
  sortValue?: (item: T) => string | number | Date | null | undefined
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (item: T) => string
  emptyState?: React.ReactNode
  isLoading?: boolean
  error?: Error | string | null
  onRetry?: () => void
  ariaLabel?: string
  className?: string
  mobileCardRender?: (item: T) => React.ReactNode
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyState,
  isLoading,
  error,
  onRetry,
  ariaLabel = 'Data table',
  className = '',
  mobileCardRender,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const visibleData = useMemo(() => {
    if (!sort) return data
    const column = columns.find((item) => item.key === sort.key)
    if (!column?.sortValue) return data
    const direction = sort.direction === 'asc' ? 1 : -1
    return [...data].sort((left, right) => {
      const a = column.sortValue?.(left)
      const b = column.sortValue?.(right)
      if (a == null) return 1
      if (b == null) return -1
      const leftValue = a instanceof Date ? a.getTime() : a
      const rightValue = b instanceof Date ? b.getTime() : b
      return typeof leftValue === 'number' && typeof rightValue === 'number'
        ? (leftValue - rightValue) * direction
        : String(leftValue).localeCompare(String(rightValue)) * direction
    })
  }, [columns, data, sort])

  const toggleSort = (column: Column<T>) => {
    if (!column.sortValue) return
    setSort((current) => current?.key === column.key
      ? { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { key: column.key, direction: 'asc' })
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-2 py-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-12 w-full bg-ds-surface-subtle animate-pulse rounded-[4px]"
          />
        ))}
      </div>
    )
  }

  if (error) {
    const message = typeof error === 'string' ? error : error.message
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center">
        <p className="text-sm font-semibold text-foreground">Unable to load this table</p>
        <p className="mt-1 text-xs text-muted-foreground">{message}</p>
        {onRetry && <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}><RefreshCw aria-hidden="true" />Try again</Button>}
      </div>
    )
  }

  if (visibleData.length === 0) {
    return <div className="w-full rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">{emptyState ?? 'No records match the current view.'}</div>
  }

  return (
    <div className={`w-full font-sans ${className}`}>
      {/* Desktop Data Table */}
      <div className="hidden md:block w-full overflow-x-auto border border-ds-border bg-ds-surface rounded-none">
        <table className="w-full text-start border-collapse" aria-label={ariaLabel}>
          <thead>
            <tr className="border-b border-ds-border bg-ds-background">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={sort?.key === col.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ds-muted text-start ${
                    col.className || ''
                  }`}
                >
                  {col.sortValue ? (
                    <button type="button" onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 text-start hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                      {col.header}
                      {sort?.key === col.key ? (sort.direction === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ArrowDownUp className="h-3.5 w-3.5 opacity-50" />}
                    </button>
                  ) : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ds-border">
            {visibleData.map((item) => (
              <tr
                key={keyExtractor(item)}
                className="hover:bg-ds-surface-subtle/50 transition-colors duration-150"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3.5 px-4 text-sm text-ds-ink ${
                      col.className || ''
                    }`}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Conversion (Section 39) */}
      <div className="block md:hidden space-y-3">
        {visibleData.map((item) => {
          if (mobileCardRender) {
            return (
              <div key={keyExtractor(item)}>
                {mobileCardRender(item)}
              </div>
            )
          }

          return (
            <div
              key={keyExtractor(item)}
              className="p-4 bg-ds-surface border border-ds-border rounded-[8px] space-y-2 shadow-none"
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  className="flex items-center justify-between text-sm py-1 border-b border-ds-border/40 last:border-b-0"
                >
                  <span className="text-xs font-medium text-ds-muted">
                    {col.mobileLabel || col.header}
                  </span>
                  <span className="text-end text-ds-ink">
                    {col.render(item)}
                  </span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
