import { describe, it, expect, vi } from 'vitest'
import { documentIngestionEngine } from './documentIngestionEngine'

vi.mock('./providers/multiProviderRouter', () => ({
  multiProviderRouter: {
    execute: vi.fn().mockResolvedValue({
      data: {
        summary: 'Front Office VIP Arrival Manual Course',
        summaryAr: 'دورة إجراءات استقبال كبار الشخصيات',
        extractedTopics: ['VIP Welcome', 'Luggage Handling', 'Concierge Escalation'],
        blueprint: {
          title: 'VIP Arrival & Check-In Protocol',
          topic: 'Front Office VIP Check-In',
          courseType: 'sop',
          targetAudience: 'Front Office Staff',
          experienceLevel: 'intermediate',
          courseLanguage: 'en',
          estimatedDurationMinutes: 25,
          learningObjectives: ['Master VIP arrival checklist'],
          sections: [
            {
              id: 'sec-1',
              title: 'VIP Greeting Protocol',
              description: 'Initial curbside to front desk greeting',
              lessons: [
                {
                  id: 'les-1',
                  title: 'Warm Welcome & Escort',
                  durationMinutes: 10,
                  content: 'Greeting procedures for VIP guests.',
                  learningPoints: ['Use surname', 'Offer cold towel'],
                  hasCheckpoint: true,
                },
              ],
            },
          ],
        },
      },
      rawText: '',
    }),
  },
}))

describe('DocumentIngestionEngine', () => {
  it('should parse document text and synthesize a full CourseBlueprint', async () => {
    const rawText = `
    PRIME HOTELS STANDARD OPERATING PROCEDURE: VIP GUEST ARRIVAL
    1. Curbside Welcome: Bell Captain must greet guest within 30 seconds of vehicle arrival.
    2. Front Desk Escort: Duty Manager conducts in-suite registration for Presidential Suite guests.
    3. Welcome Amenity: Traditional Saudi Arabian dates and signature Qahwa served upon arrival.
    `

    const result = await documentIngestionEngine.ingestDocument({
      documentText: rawText,
      fileName: 'VIP_Arrival_SOP.pdf',
      targetDepartment: 'Front Office',
      targetLanguage: 'en',
    })

    expect(result.blueprint.title).toBe('VIP Arrival & Check-In Protocol')
    expect(result.extractedTopics.length).toBeGreaterThan(0)
    expect(result.wordCount).toBeGreaterThan(10)
    expect(result.blueprint.sections.length).toBeGreaterThan(0)
  })
})
