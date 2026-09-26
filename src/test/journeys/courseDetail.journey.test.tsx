/**
 * Journey: COURSE DETAIL
 * A learner decides whether to start a course and resumes where they stopped.
 */
import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryOk, renderJourney } from './helpers'

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string, f?: string, o?: Record<string, unknown>) =>
            (f ?? k).replace(/\{\{(\w+)\}\}/g, (_: string, n: string) => String(o?.[n] ?? '')),
        i18n: { language: 'en', dir: () => 'ltr' },
    }),
}))
vi.mock('@/hooks/useTraining', () => ({ useMyAssignments: vi.fn() }))
vi.mock('@/features/learn/courseHooks', () => ({ useCourse: vi.fn(), useCourseLessons: vi.fn(), useMyCourseProgress: vi.fn() }))

import CourseDetailPage from '@/features/learn/pages/CourseDetailPage'
import { useCourse, useCourseLessons, useMyCourseProgress } from '@/features/learn/courseHooks'
import { useMyAssignments } from '@/hooks/useTraining'

const baseCourse = {
    id: 'c1', title: 'Fire Safety', description: 'Evacuation and extinguisher basics.', estimated_duration_minutes: null,
    difficulty_level: null, certificate_enabled: true, validity_period_days: 365, passing_score_percentage: 80,
    max_attempts: 3, target_audience: null, status: 'published', updated_at: null,
    objectives: ['Lead a floor evacuation'], prerequisites: [],
}
const lessons = [
    { id: 'l1', title: 'Alarms', block_type: 'text', block_order: 0, duration_seconds: 300, is_mandatory: true },
    { id: 'l2', title: 'Extinguishers', block_type: 'video', block_order: 1, duration_seconds: null, is_mandatory: true },
    { id: 'l3', title: 'Check', block_type: 'quiz', block_order: 2, duration_seconds: null, is_mandatory: true },
]

function setup({ progress = null as unknown, assignments = [] as unknown[] } = {}) {
    vi.mocked(useCourse).mockReturnValue(queryOk(baseCourse) as never)
    vi.mocked(useCourseLessons).mockReturnValue(queryOk(lessons) as never)
    vi.mocked(useMyCourseProgress).mockReturnValue(queryOk(progress) as never)
    vi.mocked(useMyAssignments).mockReturnValue(queryOk(assignments) as never)
    renderJourney(
        <Routes><Route path="/learn/courses/:id" element={<CourseDetailPage />} /></Routes>,
        { route: '/learn/courses/c1' },
    )
}

beforeEach(() => vi.clearAllMocks())

describe('journey: course detail', () => {
    it('explains what finishing gives and never invents a duration', () => {
        setup()
        expect(screen.getByRole('heading', { level: 1, name: 'Fire Safety' })).toBeInTheDocument()
        expect(screen.getByText('Lead a floor evacuation')).toBeInTheDocument()
        // Two lessons have no duration, so no total time is shown.
        expect(screen.queryByText('Time')).not.toBeInTheDocument()
        expect(screen.getByText('80%')).toBeInTheDocument()
        const finish = screen.getByRole('region', { name: 'When you finish' })
        expect(within(finish).getByText(/pass the quiz \(80%\)/)).toBeInTheDocument()
        expect(within(finish).getByText(/valid for 365 days/)).toBeInTheDocument()
        expect(screen.getAllByRole('link', { name: /Start course/ })[0]).toHaveAttribute('href', '/learn/player/c1')
    })

    it('shows why the course is required and carries the assignment into the player', () => {
        setup({ assignments: [{ id: 'a1', content_id: 'c1', content_type: 'module', priority: 'compliance', due_date: '2020-01-01T00:00:00Z' }] })
        expect(screen.getByText('Assigned to you')).toBeInTheDocument()
        expect(screen.getByText(/Overdue since/)).toBeInTheDocument()
        expect(screen.getAllByRole('link', { name: /Start course/ })[0]).toHaveAttribute('href', '/learn/player/c1?assignment=a1')
    })

    it('resumes where the learner stopped', () => {
        setup({ progress: { status: 'in_progress', progress_percentage: 40, completed_at: null, score_percentage: null, last_block_index: 1, completed_blocks: ['l1'] } })
        expect(screen.getAllByText('40% complete').length).toBeGreaterThan(0)
        expect(screen.getAllByRole('link', { name: /Resume/ }).length).toBeGreaterThan(0)
        const outline = screen.getByRole('region', { name: 'Course outline' })
        expect(within(outline).getByText(/You stopped here/)).toBeInTheDocument()
    })
})
