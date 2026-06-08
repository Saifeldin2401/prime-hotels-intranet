/**
 * MobileTable Component
 * 
 * Responsive table that switches to card view on mobile.
 * Uses tanstack/react-table for powerful table features.
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import type {
    ColumnDef,
    PaginationState,
    SortingState,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface MobileTableProps<TData> {
  /** Data to display */
  data: TData[]
  /** Column definitions */
  columns: ColumnDef<TData, unknown>[]
  /** Unique key accessor */
  getRowId?: (row: TData) => string
  /** Enable pagination */
  enablePagination?: boolean
  /** Page size for pagination */
  pageSize?: number
  /** Enable sorting */
  enableSorting?: boolean
  /** Callback when row is clicked */
  onRowClick?: (row: TData) => void
  /** Custom class for container */
  className?: string
  /** Custom class for table */
  tableClassName?: string
  /** Loading state */
  isLoading?: boolean
  /** Number of skeleton rows */
  skeletonRowCount?: number
  /** Empty state message */
  emptyMessage?: string
  /** Card view configuration for mobile */
  cardConfig?: {
    /** Primary field (title) */
    primaryField: keyof TData
    /** Secondary field (subtitle) */
    secondaryField?: keyof TData
    /** Fields to show in card body */
    detailFields?: (keyof TData)[]
    /** Custom render for primary field */
    renderPrimary?: (row: TData) => React.ReactNode
    /** Custom render for secondary field */
    renderSecondary?: (row: TData) => React.ReactNode
    /** Badge to show on card */
    badge?: {
      field: keyof TData
      variant?: 'default' | 'secondary' | 'destructive' | 'outline'
    }
  }
}

/**
 * MobileTable - Responsive table with card view on mobile
 * 
 * Usage:
 * ```tsx
 * <MobileTable
 *   data={users}
 *   columns={columns}
 *   onRowClick={(user) => navigate(`/users/${user.id}`)}
 *   cardConfig={{
 *     primaryField: 'name',
 *     secondaryField: 'email',
 *     detailFields: ['role', 'department'],
 *   }}
 * />
 * ```
 */
export function MobileTable<TData>({
  data,
  columns,
  getRowId,
  enablePagination = true,
  pageSize = 10,
  enableSorting = true,
  onRowClick,
  className,
  tableClassName,
  isLoading = false,
  skeletonRowCount = 5,
  emptyMessage = 'No data available',
  cardConfig,
}: MobileTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getRowId: getRowId as (row: TData) => string,
    state: {
      sorting,
      pagination,
    },
  })

  // Skeleton loading state
  if (isLoading) {
    return (
      <div className={className}>
        {/* Desktop skeleton */}
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.slice(0, 4).map((col, idx) => (
                  <TableHead key={idx}>
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: skeletonRowCount }).map((_, rowIdx) => (
                <TableRow key={rowIdx}>
                  {columns.slice(0, 4).map((_, colIdx) => (
                    <TableCell key={colIdx}>
                      <div className="h-4 w-full bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile skeleton */}
        <div className="md:hidden space-y-3">
          {Array.from({ length: skeletonRowCount }).map((_, idx) => (
            <Card key={idx} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-5 w-2/3 bg-muted rounded mb-2" />
                <div className="h-4 w-1/2 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (data.length === 0) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border overflow-hidden">
        <Table className={tableClassName}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      enableSorting && header.column.getCanSort() && 'cursor-pointer select-none',
                      'whitespace-nowrap'
                    )}
                    onClick={
                      enableSorting && header.column.getCanSort()
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
                className={cn(onRowClick && 'cursor-pointer')}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {table.getRowModel().rows.map((row) => {
          const data = row.original
          const primaryContent = cardConfig?.renderPrimary
            ? cardConfig.renderPrimary(data)
            : String(data[cardConfig?.primaryField as keyof TData] || '')
          
          const secondaryContent = cardConfig?.renderSecondary
            ? cardConfig.renderSecondary(data)
            : cardConfig?.secondaryField
            ? String(data[cardConfig.secondaryField] || '')
            : null

          return (
            <Card
              key={row.id}
              className={cn(
                'overflow-hidden',
                onRowClick && 'cursor-pointer active:scale-[0.99] transition-transform'
              )}
              onClick={() => onRowClick?.(data)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{primaryContent}</h3>
                    {secondaryContent && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {secondaryContent}
                      </p>
                    )}
                  </div>
                  
                  {cardConfig?.badge && (
                    <span className="shrink-0">
                      {/* Badge content would go here */}
                    </span>
                  )}
                </div>

                {/* Detail fields */}
                {cardConfig?.detailFields && cardConfig.detailFields.length > 0 && (
                  <dl className="mt-3 pt-3 border-t space-y-2">
                    {cardConfig.detailFields.map((field) => {
                      const column = columns.find(
                        (col) => (col as { accessorKey?: string }).accessorKey === field
                      )
                      const value = data[field]
                      const label = column?.header?.toString() || String(field)

                      return (
                        <div key={String(field)} className="flex justify-between gap-4">
                          <dt className="text-sm text-muted-foreground">{label}</dt>
                          <dd className="text-sm font-medium">
                            {flexRender(column?.cell, { getValue: () => value, row: { original: data } } as any) || String(value)}
                          </dd>
                        </div>
                      )
                    })}
                  </dl>
                )}

                {/* Show additional columns not in detailFields */}
                {!cardConfig?.detailFields && row.getVisibleCells().slice(2).map((cell) => (
                  <div key={cell.id} className="mt-2 flex justify-between gap-4">
                    <dt className="text-sm text-muted-foreground">
                      {typeof cell.column.columnDef.header === 'string'
                        ? cell.column.columnDef.header
                        : cell.column.id}
                    </dt>
                    <dd className="text-sm font-medium">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </dd>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pagination */}
      {enablePagination && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="touch-target"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="touch-target"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
