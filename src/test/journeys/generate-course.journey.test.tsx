/**
 * Journey: GENERATE-COURSE
 * An author runs the AI course generator: config -> multi-agent pipeline -> blueprint + QA
 * report -> saved training module (with source documents attached).
 *
 * Backend contract smoke-tested here. UI steps depend on the AI capability layer
 * (branch feat/ai-capability-layer) and the generator CMS UI.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        rpc: vi.fn(),
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
        functions: { invoke: vi.fn() },
    },
}))

import { aiCourseEngineService } from '@/services/aiCourseEngineService'

describe('journey: generate-course', () => {
    it('exposes the course-generation pipeline entry point', () => {
        expect(typeof aiCourseEngineService.executeCoursePipeline).toBe('function')
    })

    it.todo('generator form collects topic, audience, duration and grounding documents')
    it.todo('Generate button streams stage-by-stage progress callbacks')
    it.todo('pipeline returns a CourseBlueprint plus a CourseQAQualityReport')
    it.todo('QA report below the pass threshold blocks one-click publish')
    it.todo('saving the blueprint creates a training_module with ordered content blocks')
    it.todo('grounding documents auto-attach as course_source_documents on the new module')
    it.todo('an aborted run can resume from its last checkpoint via resumeJobId')
})
