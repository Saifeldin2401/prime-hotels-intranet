"use client"

import type {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    ExpandedState,
    Row,
} from "@tanstack/react-table"
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getExpandedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import * as React from "react"

import { ResponsiveTable } from "@/components/ui/responsive-table"
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { Input } from "@/components/ui/input"
import { useTranslation } from "react-i18next"
import { DataTablePagination } from "./data-table-pagination"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey?: string
    searchPlaceholder?: string
    caption?: string
    ariaLabel?: string
    renderSubComponent?: (props: { row: Row<TData> }) => React.ReactNode
    getRowCanExpand?: (row: Row<TData>) => boolean
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    searchPlaceholder,
    caption,
    ariaLabel = 'Data table',
    renderSubComponent,
    getRowCanExpand,
}: DataTableProps<TData, TValue>) {
    const { t, i18n } = useTranslation('common')
    const isRTL = i18n.dir() === 'rtl'

    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [expanded, setExpanded] = React.useState<ExpandedState>({})

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onExpandedChange: setExpanded,
        getExpandedRowModel: getExpandedRowModel(),
        getRowCanExpand,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            expanded,
        },
    })

    return (
        <div className="space-y-4">
            {searchKey && (
                <div className="flex items-center py-4">
                    <Input
                        placeholder={searchPlaceholder || t('search')}
                        value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn(searchKey)?.setFilterValue(event.target.value)
                        }
                        className="w-full sm:max-w-sm"
                        dir={isRTL ? 'rtl' : 'ltr'}
                    />
                </div>
            )}
            <ResponsiveTable className="rounded-md border mx-0 px-0">
                <Table role="table" aria-label={ariaLabel}>
                    {caption && (
                        <TableCaption className="sr-only">{caption}</TableCaption>
                    )}
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} role="row">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead 
                                            key={header.id} 
                                            className={isRTL ? 'text-right' : ''}
                                            scope="col"
                                            role="columnheader"
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <React.Fragment key={row.id}>
                                    <TableRow
                                        data-state={row.getIsSelected() && "selected"}
                                        role="row"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} role="cell">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    {row.getIsExpanded() && renderSubComponent && (
                                        <TableRow>
                                            <TableCell colSpan={row.getVisibleCells().length} className="p-0 border-b">
                                                {renderSubComponent({ row })}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))
                        ) : (
                            <TableRow role="row">
                                <TableCell 
                                    colSpan={columns.length} 
                                    className="h-24 text-center"
                                    role="cell"
                                >
                                    {t('noResults')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ResponsiveTable>
            <DataTablePagination table={table} />
        </div>
    )
}
