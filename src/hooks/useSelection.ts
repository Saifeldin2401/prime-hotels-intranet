import { useState, useCallback, useMemo } from 'react'

interface UseSelectionOptions<T> {
    items: T[]
    getItemId: (item: T) => string
}

interface UseSelectionReturn {
    selectedIds: Set<string>
    selectedCount: number
    isSelected: (id: string) => boolean
    isAllSelected: boolean
    isSomeSelected: boolean
    toggleItem: (id: string) => void
    toggleAll: () => void
    selectAll: () => void
    clearSelection: () => void
    selectItems: (ids: string[]) => void
    getSelectedItems: <T>(items: T[], getItemId: (item: T) => string) => T[]
}

/**
 * Hook for managing item selection state
 * 
 * @example
 * const { selectedIds, toggleItem, toggleAll, isSelected, clearSelection } = useSelection({
 *   items: tasks,
 *   getItemId: (task) => task.id
 * })
 */
export function useSelection<T>({
    items,
    getItemId
}: UseSelectionOptions<T>): UseSelectionReturn {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const itemIds = useMemo(() =>
        new Set(items.map(getItemId)),
        [items, getItemId]
    )

    const selectedCount = selectedIds.size

    const isSelected = useCallback((id: string) =>
        selectedIds.has(id),
        [selectedIds]
    )

    const isAllSelected = useMemo(() =>
        items.length > 0 && items.every(item => selectedIds.has(getItemId(item))),
        [items, selectedIds, getItemId]
    )

    const isSomeSelected = useMemo(() =>
        items.some(item => selectedIds.has(getItemId(item))) && !isAllSelected,
        [items, selectedIds, getItemId, isAllSelected]
    )

    const toggleItem = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }, [])

    const toggleAll = useCallback(() => {
        if (isAllSelected) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(items.map(getItemId)))
        }
    }, [isAllSelected, items, getItemId])

    const selectAll = useCallback(() => {
        setSelectedIds(new Set(items.map(getItemId)))
    }, [items, getItemId])

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set())
    }, [])

    const selectItems = useCallback((ids: string[]) => {
        setSelectedIds(new Set(ids))
    }, [])

    const getSelectedItems = useCallback(<U,>(
        allItems: U[],
        getId: (item: U) => string
    ): U[] => {
        return allItems.filter(item => selectedIds.has(getId(item)))
    }, [selectedIds])

    return {
        selectedIds,
        selectedCount,
        isSelected,
        isAllSelected,
        isSomeSelected,
        toggleItem,
        toggleAll,
        selectAll,
        clearSelection,
        selectItems,
        getSelectedItems
    }
}

/**
 * Simple selection hook without item awareness
 */
export function useSimpleSelection() {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const toggleItem = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }, [])

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set())
    }, [])

    const selectItems = useCallback((ids: string[]) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            ids.forEach(id => next.add(id))
            return next
        })
    }, [])

    const deselectItems = useCallback((ids: string[]) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            ids.forEach(id => next.delete(id))
            return next
        })
    }, [])

    return {
        selectedIds,
        selectedIdsArray: Array.from(selectedIds),
        selectedCount: selectedIds.size,
        isSelected: (id: string) => selectedIds.has(id),
        toggleItem,
        clearSelection,
        selectItems,
        deselectItems
    }
}
