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
function toCSV<T extends Record<string, unknown>>(
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
