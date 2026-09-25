/**
 * Journey: GENERATE-COURSE
 * An author runs the AI course generator: config -> multi-agent pipeline -> blueprint + QA
 * report -> saved training module (with source documents attached).
 *
 * Backend contract smoke-tested here. UI steps depend on the AI capability layer
 * (branch feat/ai-capability-layer) and the generator CMS UI.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', async () => {
    const { createMockSupabaseClient } = await import('../mocks/supabase')
    return {
        supabase: createMockSupabaseClient(),
    }
})

import { supabase } from '@/lib/supabase'
import { aiCourseEngineService } from '@/services/aiCourseEngineService'

describe('journey: generate-course', () => {
    it('exposes the course-generation pipeline and asset management endpoints', () => {
        expect(typeof aiCourseEngineService.executeCoursePipeline).toBe('function')
        expect(typeof aiCourseEngineService.saveBlueprintToDatabase).toBe('function')
        expect(typeof aiCourseEngineService.generateLessonVisualAsset).toBe('function')
        expect(typeof aiCourseEngineService.getPresets).toBe('function')
        expect(typeof aiCourseEngineService.getGenerationHistory).toBe('function')
    })

    it('getPresets retrieves saved generation presets', async () => {
        const mockPresets = [
            { id: 'preset-1', name: 'Luxury Service', is_system: true },
            { id: 'preset-2', name: 'Food Hygiene', is_system: false },
        ]

        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPresets, error: null }),
        } as never)

        const presets = await aiCourseEngineService.getPresets()
        expect(Array.isArray(presets)).toBe(true)
        expect(presets.length).toBe(2)
        expect(presets[0].name).toBe('Luxury Service')
    })

    it('getGenerationHistory fetches prior course generation jobs', async () => {
        const mockHistory = [
            { id: 'job-1', status: 'completed' },
        ]

        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: mockHistory, error: null }),
        } as never)

        const history = await aiCourseEngineService.getGenerationHistory()
        expect(Array.isArray(history)).toBe(true)
        expect(history.length).toBe(1)
        expect(history[0].id).toBe('job-1')
        expect(history[0].status).toBe('completed')
    })

    it('getCloudflareUsageStats returns neuronic usage tracking statistics', () => {
        const stats = aiCourseEngineService.getCloudflareUsageStats()
        expect(stats).toBeDefined()
        expect(typeof stats.usedNeurons).toBe('number')
    })

    it('deleteVisualAsset removes persisted visual asset from database', async () => {
        vi.mocked(supabase.from).mockReturnValue({
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as never)

        await expect(aiCourseEngineService.deleteVisualAsset('00000000-0000-0000-0000-000000000001')).resolves.not.toThrow()
    })
})
