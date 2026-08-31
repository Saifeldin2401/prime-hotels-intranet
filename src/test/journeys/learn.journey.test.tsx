/**
 * Journey: LEARN
 * A learner lands on their home page, sees what to do next, and resumes a lesson.
 *
 * Steps covered here (rendered + primary action):
 *  1. Learner home renders the six sections
 *  2. "Continue learning" surfaces the last in-progress lesson with its % and a Resume link
 *  3. "Assigned training" lists mandatory items, overdue first
 *  4. Empty states render honestly when a section has no data
 *
 * Steps deferred to not-yet-built features are marked it.todo below.
 */
import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryOk, renderJourney } from './helpers'

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string, f?: string) => f ?? k, i18n: { language: 'en', dir: () => 'ltr' } }),
    Trans: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('@/hooks/useCertificates', () => ({ useMyCertificates: vi.fn() }))
vi.mock('@/hooks/useKnowledge', () => ({ useBookmarks: vi.fn() }))
vi.mock('@/hooks/useLearningProgress', () => ({ useLearningProgress: vi.fn() }))
vi.mock('@/hooks/useTraining', () => ({ useMyAssignments: vi.fn(), useTrainingModules: vi.fn() }))

import LearnerHome from '@/pages/home/LearnerHome'
import { useAuth } from '@/hooks/useAuth'
import { useMyCertificates } from '@/hooks/useCertificates'
import { useBookmarks } from '@/hooks/useKnowledge'
import { useLearningProgress } from '@/hooks/useLearningProgress'
import { useMyAssignments, useTrainingModules } from '@/hooks/useTraining'

const USER_ID = 'learner-1'

function setup(overrides: Partial<Record<string, unknown>> = {}) {
    vi.mocked(useAuth).mockReturnValue({
        user: { id: USER_ID },
        profile: { full_name: 'Dana Learner' },
    } as never)
    vi.mocked(useLearningProgress).mockReturnValue(
        (overrides.progress ?? queryOk([])) as never,
    )
    vi.mocked(useMyAssignments).mockReturnValue((overrides.assignments ?? queryOk([])) as never)
    vi.mocked(useTrainingModules).mockReturnValue((overrides.modules ?? queryOk([])) as never)
    vi.mocked(useMyCertificates).mockReturnValue((overrides.certificates ?? queryOk([])) as never)
    vi.mocked(useBookmarks).mockReturnValue((overrides.bookmarks ?? queryOk([])) as never)
}

beforeEach(() => vi.clearAllMocks())

describe('journey: learn', () => {
    it('step 1: renders all six learner-home sections', () => {
        setup()
        renderJourney(<LearnerHome />, { route: '/home/learner' })
        expect(screen.getByText('Continue learning')).toBeInTheDocument()
        expect(screen.getByText('Assigned training')).toBeInTheDocument()
        expect(screen.getByText('Recommended')).toBeInTheDocument()
        expect(screen.getByText('My progress')).toBeInTheDocument()
        expect(screen.getByText('Certificates & skills')).toBeInTheDocument()
        expect(screen.getByText('Saved knowledge')).toBeInTheDocument()
    })

    it('step 2: continue-learning surfaces the last in-progress lesson with a Resume link', () => {
        setup({
            progress: queryOk([
                {
                    id: 'p1',
                    user_id: USER_ID,
                    content_id: 'mod-42',
                    content_type: 'module',
                    status: 'in_progress',
                    progress_percentage: 65,
                    last_accessed_at: '2026-08-30T10:00:00Z',
                    training_modules: { id: 'mod-42', title: 'Fire Safety Basics' },
                },
                {
                    id: 'p2',
                    user_id: USER_ID,
                    content_id: 'mod-10',
                    content_type: 'module',
                    status: 'in_progress',
                    progress_percentage: 20,
                    last_accessed_at: '2026-08-01T10:00:00Z',
                    training_modules: { id: 'mod-10', title: 'Older Course' },
                },
            ]),
        })
        renderJourney(<LearnerHome />, { route: '/home/learner' })
        expect(screen.getByText('Fire Safety Basics')).toBeInTheDocument()
        expect(screen.getByText('65% complete')).toBeInTheDocument()
        const resume = screen.getByRole('link', { name: 'Resume' })
        expect(resume).toHaveAttribute('href', '/learning/training/mod-42')
    })

    it('step 3: assigned training lists items overdue-first with an Overdue badge', () => {
        setup({
            assignments: queryOk([
                {
                    id: 'a1',
                    content_id: 'q-1',
                    content_type: 'quiz',
                    content_title: 'Allergen Handling Quiz',
                    priority: 'compliance',
                    due_date: '2020-01-01T00:00:00Z',
                    progress: { status: 'in_progress' },
                },
                {
                    id: 'a2',
                    content_id: 'm-2',
                    content_type: 'module',
                    content_title: 'Guest Service Standards',
                    priority: 'normal',
                    due_date: '2099-01-01T00:00:00Z',
                    progress: null,
                },
            ]),
        })
        renderJourney(<LearnerHome />, { route: '/home/learner' })
        const items = screen.getAllByRole('listitem').map((li) => li.textContent)
        expect(items[0]).toContain('Allergen Handling Quiz')
        const firstItem = screen.getByText('Allergen Handling Quiz').closest('li') as HTMLElement
        expect(within(firstItem).getByText(/Overdue/)).toBeInTheDocument()
        expect(within(firstItem).getByText('Mandatory')).toBeInTheDocument()
    })

    it('step 4: honest empty states when nothing is assigned or recommended', () => {
        setup()
        renderJourney(<LearnerHome />, { route: '/home/learner' })
        expect(screen.getByText('No assigned training')).toBeInTheDocument()
        expect(screen.getByText('Nothing recommended yet')).toBeInTheDocument()
        expect(screen.getByText('No certificates yet')).toBeInTheDocument()
    })

    it('step 5: recommended excludes assigned and started modules', () => {
        setup({
            progress: queryOk([
                { id: 'p1', user_id: USER_ID, content_id: 'mod-started', content_type: 'module', status: 'in_progress', progress_percentage: 10 },
            ]),
            assignments: queryOk([
                { id: 'a1', content_id: 'mod-assigned', content_type: 'module', content_title: 'Assigned', priority: 'normal', progress: null },
            ]),
            modules: queryOk([
                { id: 'mod-started', title: 'Started One', status: 'published' },
                { id: 'mod-assigned', title: 'Assigned One', status: 'published' },
                { id: 'mod-fresh', title: 'Fresh Course', status: 'published' },
                { id: 'mod-draft', title: 'Draft Course', status: 'draft' },
            ]),
        })
        renderJourney(<LearnerHome />, { route: '/home/learner' })
        const rec = screen.getByText('Recommended').closest('div')?.parentElement as HTMLElement
        expect(within(rec).getByText('Fresh Course')).toBeInTheDocument()
        expect(within(rec).queryByText('Started One')).not.toBeInTheDocument()
        expect(within(rec).queryByText('Assigned One')).not.toBeInTheDocument()
        expect(within(rec).queryByText('Draft Course')).not.toBeInTheDocument()
    })

    // Not-yet-built: these depend on features outside this slice.
    it.todo('opening a lesson from Continue learning renders the TrainingPlayer and tracks a heartbeat')
    it.todo('completing the final block marks the lesson complete and updates the progress ring')
    it.todo('a learning path groups multiple courses with an ordered, gated sequence')
})
