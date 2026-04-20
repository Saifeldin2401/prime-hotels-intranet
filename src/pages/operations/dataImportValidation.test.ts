import { describe, expect, it } from 'vitest'

import {
  deriveRoomsAvailable,
  finalizeExtractedData,
  getImportBlockingIssues,
  type ExtractedData,
} from './dataImportValidation'

function createExtractedData(overrides?: Partial<ExtractedData>): ExtractedData {
  return {
    detectedFormat: 'pms_daily',
    dateRange: { start: '2026-04-13', end: '2026-04-13' },
    records: [],
    summary: { totalRecords: 0, propertiesFound: 0 },
    qualityScore: 100,
    qualityIssues: [],
    fieldConfidence: {},
    ...overrides,
  }
}

describe('dataImportValidation', () => {
  it('derives rooms_available from rooms_sold and occupancy percentage', () => {
    expect(deriveRoomsAvailable({ rooms_sold: '84', occupancy: '80' })).toBe('105')
  })

  it('normalizes pms records and flags missing inventory as a quality issue', () => {
    const normalized = finalizeExtractedData(createExtractedData({
      records: [
        { business_date: '2026-04-13', rooms_sold: '84', occupancy: '80', detected_property_id: 'prop-1' },
        { business_date: '2026-04-13', rooms_sold: '10', detected_property_id: 'prop-1' },
      ],
      summary: { totalRecords: 2, propertiesFound: 1 }
    }))

    expect(normalized.records[0].rooms_available).toBe('105')
    expect(normalized.fieldConfidence.rooms_available).toBe(0)
    expect(normalized.qualityIssues).toContain(
      'Rooms available could not be determined for 1 record(s). Enter it before importing.'
    )
  })

  it('blocks import when property assignment or rooms_available is missing', () => {
    const issues = getImportBlockingIssues(createExtractedData({
      detectedFormat: 'occupancy',
      records: [{ business_date: '2026-04-13', rooms_sold: '20' }],
      summary: { totalRecords: 1, propertiesFound: 0 }
    }))

    expect(issues).toContain('Each record must be assigned to a property before import.')
    expect(issues).toContain(
      'Rooms available is required for occupancy imports and must be entered before import.'
    )
  })
})
