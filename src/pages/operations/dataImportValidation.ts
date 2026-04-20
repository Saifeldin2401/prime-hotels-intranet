import i18n from '@/i18n/i18n'

export type ExtractedRecord = Record<string, string | number | null | undefined>

export interface ExtractedData {
    records: ExtractedRecord[]
    detectedFormat: 'pms_daily' | 'occupancy' | 'revenue' | 'unknown'
    dateRange: { start: string; end: string }
    summary: {
        totalRecords: number
        roomsSold?: number
        totalRevenue?: number
        avgOccupancy?: number
        propertiesFound: number
    }
    qualityScore: number
    qualityIssues: string[]
    fieldConfidence: Record<string, number>
}

export function parseNumericValue(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null

    const normalized = String(value).replace(/,/g, '').replace(/%/g, '').trim()
    if (!normalized) return null

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
}

export function normalizeOccupancyValue(value: unknown): number | null {
    const parsed = parseNumericValue(value)
    if (parsed === null) return null

    if (parsed > 0 && parsed <= 1) {
        return parsed * 100
    }

    return parsed
}

export function deriveRoomsAvailable(record: ExtractedRecord): string | null {
    const explicitRoomsAvailable = parseNumericValue(record.rooms_available)
    if (explicitRoomsAvailable !== null && explicitRoomsAvailable > 0) {
        return String(Math.round(explicitRoomsAvailable))
    }

    const roomsSold = parseNumericValue(record.rooms_sold)
    const occupancy = normalizeOccupancyValue(record.occupancy)

    if (roomsSold === null || roomsSold <= 0 || occupancy === null || occupancy <= 0) {
        return null
    }

    const derived = Math.round(roomsSold / (occupancy / 100))
    return derived > 0 ? String(derived) : null
}

export function requiresRoomsAvailable(format: ExtractedData['detectedFormat']) {
    return format === 'pms_daily' || format === 'occupancy'
}

export function finalizeExtractedData(extracted: ExtractedData): ExtractedData {
    const records = extracted.records.map((record) => {
        const resolvedRoomsAvailable = deriveRoomsAvailable(record)
        if (!resolvedRoomsAvailable) {
            return record
        }

        return {
            ...record,
            rooms_available: resolvedRoomsAvailable,
        }
    })

    const qualityIssues = [...extracted.qualityIssues]
    const fieldConfidence = { ...extracted.fieldConfidence }
    let qualityScore = extracted.qualityScore

    if (requiresRoomsAvailable(extracted.detectedFormat)) {
        const missingRoomsAvailable = records.filter((record) => !deriveRoomsAvailable(record)).length

        if (missingRoomsAvailable > 0) {
            qualityIssues.push(i18n.t('operations:data_import.validation.rooms_available_missing', {
                defaultValue: 'Rooms available could not be determined for {{count}} record(s). Enter it before importing.',
                count: missingRoomsAvailable
            }))
            fieldConfidence.rooms_available = 0
            qualityScore = Math.max(0, qualityScore - Math.min(30, missingRoomsAvailable * 10))
        } else {
            fieldConfidence.rooms_available = 100
        }
    }

    return {
        ...extracted,
        records,
        qualityIssues: Array.from(new Set(qualityIssues)),
        qualityScore,
        fieldConfidence,
    }
}

export function getImportBlockingIssues(extracted: ExtractedData, fallbackPropertyId?: string | null): string[] {
    const issues = new Set<string>()

    extracted.records.forEach((record) => {
        if (!record.business_date) {
            issues.add(i18n.t('operations:data_import.validation.missing_business_date', {
                defaultValue: 'Each record must include a business date before import.'
            }))
        }

        const effectivePropertyId = record.detected_property_id || fallbackPropertyId
        if (!effectivePropertyId || effectivePropertyId === 'all') {
            issues.add(i18n.t('operations:data_import.validation.missing_property', {
                defaultValue: 'Each record must be assigned to a property before import.'
            }))
        }

        if (requiresRoomsAvailable(extracted.detectedFormat) && !deriveRoomsAvailable(record)) {
            issues.add(i18n.t('operations:data_import.validation.missing_rooms_available', {
                defaultValue: 'Rooms available is required for occupancy imports and must be entered before import.'
            }))
        }
    })

    return Array.from(issues)
}
