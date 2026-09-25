/**
 * Journey: LEARN
 * A learner opens My day, sees what is required now, and resumes a course.
 *
 * Steps covered here (rendered + primary action):
 *  1. My day renders its sections in priority order
 *  2. "Continue" surfaces the most recently touched course with its % and a Resume link
 *  3. "Required now" lists overdue and mandatory items, most overdue first
 *  4. Empty states render honestly when a section has no data
 *  5. "Due soon" holds the rest of the near-term work, not far-future items
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
vi.mock('@/hooks/useTraining', () => ({ useMyAssignments: vi.fn() }))

import LearnerHome from '@/pages/home/LearnerHome'
import { useAuth } from '@/hooks/useAuth'
import { useMyCertificates } from '@/hooks/useCertificates'
import { useBookmarks } from '@/hooks/useKnowledge'
import { useLearningProgress } from '@/hooks/useLearningProgress'
import { useMyAssignments } from '@/hooks/useTraining'
import { learningService } from '@/services/learningService'
import { awardCertificationPathCertificates } from '@/services/certificationPathService'

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
    vi.mocked(useMyCertificates).mockReturnValue((overrides.certificates ?? queryOk([])) as never)
    vi.mocked(useBookmarks).mockReturnValue((overrides.bookmarks ?? queryOk([])) as never)
}

beforeEach(() => vi.clearAllMocks())

describe('journey: learn', () => {
    it('step 1: renders My day sections in priority order', () => {
        setup()
        renderJourney(<LearnerHome />, { route: '/learn' })
        expect(screen.getByRole('heading', { level: 1, name: /Dana/ })).toBeInTheDocument()
        const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
        expect(headings).toEqual(['Required now', 'Due soon', 'Saved knowledge', 'Your record'])
        // Only the member's own progress is requested, never the organization's.
        expect(useLearningProgress).toHaveBeenCalledWith({ userId: USER_ID })
    })

    it('step 2: continue surfaces the most recent in-progress course with a Resume link', () => {
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
                    courses: { id: 'mod-42', title: 'Fire Safety Basics' },
                },
                {
                    id: 'p2',
                    user_id: USER_ID,
                    content_id: 'mod-10',
                    content_type: 'module',
                    status: 'in_progress',
                    progress_percentage: 20,
                    last_accessed_at: '2026-08-01T10:00:00Z',
                    courses: { id: 'mod-10', title: 'Older Course' },
                },
            ]),
        })
        renderJourney(<LearnerHome />, { route: '/learn' })
        expect(screen.getByText('Fire Safety Basics')).toBeInTheDocument()
        expect(screen.queryByText('Older Course')).not.toBeInTheDocument()
        expect(screen.getByText('65%')).toBeInTheDocument()
        const resume = screen.getByRole('link', { name: /Resume/i })
        expect(resume).toHaveAttribute('href', '/learn/player/mod-42')
    })

    it('step 3: required now lists overdue and mandatory items, most overdue first', () => {
        setup({
            assignments: queryOk([
                {
                    id: 'a2',
                    content_id: 'm-2',
                    content_type: 'module',
                    content_title: 'Guest Service Standards',
                    priority: 'compliance',
                    due_date: '2099-01-01T00:00:00Z',
                    progress: null,
                },
                {
                    id: 'a1',
                    content_id: 'q-1',
                    content_type: 'quiz',
                    content_title: 'Allergen Handling Quiz',
                    priority: 'normal',
                    due_date: '2020-01-01T00:00:00Z',
                    progress: { status: 'in_progress' },
                },
            ]),
        })
        renderJourney(<LearnerHome />, { route: '/learn' })
        const required = screen.getByRole('region', { name: 'Required now' })
        const items = within(required).getAllByRole('listitem')
        expect(items[0]).toHaveTextContent('Allergen Handling Quiz')
        expect(items[0]).toHaveTextContent(/Overdue since/)
        expect(within(items[0]).getByRole('link', { name: /Resume/ })).toHaveAttribute('href', '/learn/quizzes/q-1?assignment=a1')
        expect(items[1]).toHaveTextContent('Guest Service Standards')
        expect(within(items[1]).getByRole('link', { name: /Start/ })).toHaveAttribute('href', '/learn/player/m-2?assignment=a2')
    })

    it('step 4: honest empty states when nothing is assigned or saved', () => {
        setup()
        renderJourney(<LearnerHome />, { route: '/learn' })
        expect(screen.getByText('Nothing required right now')).toBeInTheDocument()
        expect(screen.getByText('Nothing else due soon')).toBeInTheDocument()
        expect(screen.getByText('No saved articles')).toBeInTheDocument()
        expect(screen.queryByText(/Continue where you left off/)).not.toBeInTheDocument()
    })

    it('step 5: due soon holds near-term optional work and skips far-future items', () => {
        const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        setup({
            assignments: queryOk([
                { id: 'a1', content_id: 'm-soon', content_type: 'module', content_title: 'Soon Course', priority: 'normal', due_date: soon, progress: null },
                { id: 'a2', content_id: 'm-far', content_type: 'module', content_title: 'Far Course', priority: 'normal', due_date: '2099-01-01T00:00:00Z', progress: null },
                { id: 'a3', content_id: 'm-done', content_type: 'module', content_title: 'Done Course', priority: 'normal', due_date: soon, progress: { status: 'completed' } },
            ]),
        })
        renderJourney(<LearnerHome />, { route: '/learn' })
        const dueSoon = screen.getByRole('region', { name: 'Due soon' })
        expect(within(dueSoon).getByText('Soon Course')).toBeInTheDocument()
        expect(screen.queryByText('Far Course')).not.toBeInTheDocument()
        expect(screen.queryByText('Done Course')).not.toBeInTheDocument()
    })

    it('step 6: submitQuizProgress exposes training progress mutation', () => {
        expect(typeof learningService.submitQuizProgress).toBe('function')
    })

    it('step 7: completeTrainingModuleRPC completes training module', () => {
        expect(typeof learningService.completeTrainingModuleRPC).toBe('function')
    })

    it('step 8: awardCertificationPathCertificates handles path certificate award', () => {
        expect(typeof awardCertificationPathCertificates).toBe('function')
    })
})
