import { useState, useMemo } from 'react'

export interface PaginationState {
    page: number
    pageSize: number
    totalCount: number
}

export interface PaginationControls {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
    setPage: (page: number) => void
    setPageSize: (size: number) => void
    nextPage: () => void
    previousPage: () => void
    setTotalCount: (count: number) => void
    from: number
    to: number
}

const DEFAULT_PAGE_SIZE = 25

export function usePagination(initialPageSize = DEFAULT_PAGE_SIZE): PaginationControls {
    const [page, setPageState] = useState(1)
    const [pageSize, setPageSizeState] = useState(initialPageSize)
    const [totalCount, setTotalCount] = useState(0)

    const totalPages = useMemo(() => Math.ceil(totalCount / pageSize) || 1, [totalCount, pageSize])
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    // Calculate range for Supabase .range(from, to)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const setPage = (newPage: number) => {
        const validPage = Math.max(1, Math.min(newPage, totalPages))
        setPageState(validPage)
    }

    const setPageSize = (size: number) => {
        setPageSizeState(size)
        setPageState(1) // Reset to page 1 when changing page size
    }

    const nextPage = () => {
        if (hasNextPage) setPageState(p => p + 1)
    }

    const previousPage = () => {
        if (hasPreviousPage) setPageState(p => p - 1)
    }

    return {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        setPage,
        setPageSize,
        nextPage,
        previousPage,
        setTotalCount,
        from,
        to
    }
}

export default usePagination
