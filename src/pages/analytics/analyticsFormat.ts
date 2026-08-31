/** Small formatting helpers shared by the learning-analytics panels. */

export function formatDuration(totalSeconds: number | null | undefined): string {
    if (!totalSeconds || totalSeconds <= 0) return '--'
    const s = Math.round(totalSeconds)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m`
    return `${s}s`
}

export function formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '--'
    return `${Math.round(value * 10) / 10}%`
}

export function formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '--'
    return new Intl.NumberFormat().format(value)
}

export function formatDate(value: string | null | undefined): string {
    if (!value) return '--'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '--'
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Time-window options common to every panel. */
export const WINDOW_OPTIONS = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
    { value: '365', label: 'Last 12 months' },
] as const
