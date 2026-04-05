import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PaginationControls } from '@/hooks/usePagination'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface PaginationBarProps {
    pagination: PaginationControls
    pageSizeOptions?: number[]
    showPageSizeSelector?: boolean
}

export function PaginationBar({
    pagination,
    pageSizeOptions = [10, 25, 50, 100],
    showPageSizeSelector = true
}: PaginationBarProps) {
    const { t } = useTranslation('common')
    const { page, pageSize, totalCount, totalPages, hasNextPage, hasPreviousPage, setPage, setPageSize, from, to } = pagination

    if (totalCount === 0) return null

    return (
        <div className="flex items-center justify-between px-2 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                    Showing {from + 1} - {Math.min(to + 1, totalCount)} of {totalCount}
                </span>
            </div>

            <div className="flex items-center gap-4">
                {showPageSizeSelector && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {pageSizeOptions.map((size) => (
                                    <SelectItem key={size} value={size.toString()}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage(1)}
                        disabled={!hasPreviousPage}
                        aria-label={t('accessibility.firstPage', 'First page')}
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => pagination.previousPage()}
                        disabled={!hasPreviousPage}
                        aria-label={t('accessibility.previousPage', 'Previous page')}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <span className="mx-2 text-sm">
                        Page {page} of {totalPages}
                    </span>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => pagination.nextPage()}
                        disabled={!hasNextPage}
                        aria-label={t('accessibility.nextPage', 'Next page')}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage(totalPages)}
                        disabled={!hasNextPage}
                        aria-label={t('accessibility.lastPage', 'Last page')}
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default PaginationBar
