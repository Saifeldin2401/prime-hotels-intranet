/**
 * Data Export Utilities
 * 
 * Functions for exporting data to CSV and Excel formats.
 */

interface ExportColumn<T> {
    key: keyof T | string
    header: string
    formatter?: (value: unknown, row: T) => string
}

/**
 * Convert data to CSV string
 */
export function toCSV<T extends Record<string, unknown>>(
    data: T[],
    columns: ExportColumn<T>[]
): string {
    if (data.length === 0) return ''

    // Headers
    const headerRow = columns.map(col => `"${col.header}"`).join(',')

    // Data rows
    const dataRows = data.map(row => {
        return columns.map(col => {
            const value = getNestedValue(row, col.key as string)
            const formatted = col.formatter
                ? col.formatter(value, row)
                : formatValue(value)
            // Escape quotes in the value
            return `"${String(formatted).replace(/"/g, '""')}"`
        }).join(',')
    })

    return [headerRow, ...dataRows].join('\n')
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
        if (current && typeof current === 'object') {
            return (current as Record<string, unknown>)[key]
        }
        return undefined
    }, obj)
}

/**
 * Format value for CSV
 */
function formatValue(value: unknown): string {
    if (value === null || value === undefined) return ''
    if (value instanceof Date) return value.toISOString()
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
}

/**
 * Download data as CSV file
 */
export function downloadCSV<T extends Record<string, unknown>>(
    data: T[],
    columns: ExportColumn<T>[],
    filename: string
): void {
    const csv = toCSV(data, columns)
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `${filename}.csv`)
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
}

/**
 * Export tasks to CSV
 */
export function exportTasksToCSV(tasks: Array<{
    id: string
    title: string
    description?: string | null
    status: string
    priority: string
    due_date?: string | null
    assigned_to?: { full_name?: string | null } | null
    property?: { name?: string | null } | null
    department?: { name?: string | null } | null
    created_at: string
}>): void {
    const columns: ExportColumn<typeof tasks[0]>[] = [
        { key: 'title', header: 'Title' },
        { key: 'description', header: 'Description' },
        { key: 'status', header: 'Status', formatter: (v) => String(v).replace('_', ' ') },
        { key: 'priority', header: 'Priority' },
        { key: 'due_date', header: 'Due Date', formatter: (v) => v ? new Date(v as string).toLocaleDateString() : '' },
        { key: 'assigned_to.full_name', header: 'Assigned To' },
        { key: 'property.name', header: 'Property' },
        { key: 'department.name', header: 'Department' },
        { key: 'created_at', header: 'Created', formatter: (v) => new Date(v as string).toLocaleDateString() }
    ]

    downloadCSV(tasks, columns, `tasks-export-${Date.now()}`)
}

/**
 * Export maintenance tickets to CSV
 */
export function exportMaintenanceToCSV(tickets: Array<{
    id: string
    title: string
    description?: string | null
    status: string
    priority: string
    location?: string | null
    room_number?: string | null
    reported_by?: { full_name?: string | null } | null
    assigned_to?: { full_name?: string | null } | null
    property?: { name?: string | null } | null
    created_at: string
}>): void {
    const columns: ExportColumn<typeof tickets[0]>[] = [
        { key: 'title', header: 'Title' },
        { key: 'description', header: 'Description' },
        { key: 'status', header: 'Status', formatter: (v) => String(v).replace('_', ' ') },
        { key: 'priority', header: 'Priority' },
        { key: 'location', header: 'Location' },
        { key: 'room_number', header: 'Room' },
        { key: 'reported_by.full_name', header: 'Reported By' },
        { key: 'assigned_to.full_name', header: 'Assigned To' },
        { key: 'property.name', header: 'Property' },
        { key: 'created_at', header: 'Created', formatter: (v) => new Date(v as string).toLocaleDateString() }
    ]

    downloadCSV(tickets, columns, `maintenance-export-${Date.now()}`)
}

/**
 * Export leave requests to CSV
 */
export function exportLeaveRequestsToCSV(requests: Array<{
    id: string
    type: string
    start_date: string
    end_date: string
    status: string
    reason?: string | null
    requester?: { full_name?: string | null } | null
    approved_by?: { full_name?: string | null } | null
    property?: { name?: string | null } | null
    department?: { name?: string | null } | null
    created_at: string
}>): void {
    const columns: ExportColumn<typeof requests[0]>[] = [
        { key: 'type', header: 'Leave Type' },
        { key: 'requester.full_name', header: 'Requester' },
        { key: 'start_date', header: 'Start Date', formatter: (v) => new Date(v as string).toLocaleDateString() },
        { key: 'end_date', header: 'End Date', formatter: (v) => new Date(v as string).toLocaleDateString() },
        { key: 'status', header: 'Status' },
        { key: 'reason', header: 'Reason' },
        { key: 'approved_by.full_name', header: 'Approved By' },
        { key: 'property.name', header: 'Property' },
        { key: 'department.name', header: 'Department' },
        { key: 'created_at', header: 'Submitted', formatter: (v) => new Date(v as string).toLocaleDateString() }
    ]

    downloadCSV(requests, columns, `leave-requests-export-${Date.now()}`)
}

/**
 * Generic JSON export
 */
export function downloadJSON<T>(
    data: T[],
    filename: string
): void {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    downloadBlob(blob, `${filename}.json`)
}
