/**
 * Journey: EXPLORE
 * A learner searches the catalog and sees their real progress on each course.
 */
import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryOk, renderJourney } from './helpers'

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string, f?: string) => f ?? k, i18n: { language: 'en', dir: () => 'ltr' } }),
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'learner-1' } }) }))
vi.mock('@/hooks/useLearningProgress', () => ({ useLearningProgress: vi.fn() }))
vi.mock('@/features/learn/catalogHooks', () => ({ useCatalog: vi.fn() }))

import ExplorePage from '@/features/learn/pages/ExplorePage'
import { useCatalog } from '@/features/learn/catalogHooks'
import { useLearningProgress } from '@/hooks/useLearningProgress'

const course = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
    id, title, description: null, estimated_duration_minutes: null, difficulty_level: null,
    certificate_enabled: false, created_at: '2026-09-01T00:00:00Z', ...extra,
})

beforeEach(() => {
    vi.mocked(useCatalog).mockReturnValue(queryOk([
        course('c1', 'Fire Safety', { estimated_duration_minutes: 25, certificate_enabled: true }),
        course('c2', 'Guest Recovery'),
        course('c3', 'Allergen Handling'),
    ]) as never)
    vi.mocked(useLearningProgress).mockReturnValue(queryOk([
        { content_id: 'c2', content_type: 'module', status: 'in_progress', progress_percentage: 40 },
        { content_id: 'c3', content_type: 'module', status: 'completed', progress_percentage: 100 },
    ]) as never)
})

describe('journey: explore', () => {
    it('lists published courses with only real facts and links to the course page', () => {
        renderJourney(<ExplorePage />, { route: '/learn/courses' })
        const fire = screen.getByText('Fire Safety').closest('a') as HTMLElement
        expect(fire).toHaveAttribute('href', '/learn/courses/c1')
        expect(within(fire).getByText('{{count}} min')).toBeInTheDocument()
        expect(within(fire).getByText('Certificate')).toBeInTheDocument()
        // No invented duration for a course without one
        const guest = screen.getByText('Guest Recovery').closest('a') as HTMLElement
        expect(within(guest).queryByText('{{count}} min')).not.toBeInTheDocument()
    })

    it('shows the learner’s progress and filters by it', () => {
        renderJourney(<ExplorePage />, { route: '/learn/courses' })
        expect(within(screen.getByText('Allergen Handling').closest('a') as HTMLElement).getByText('Completed')).toBeInTheDocument()
        expect(screen.getByText('40%')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: /In progress/ }))
        expect(screen.getByText('Guest Recovery')).toBeInTheDocument()
        expect(screen.queryByText('Fire Safety')).not.toBeInTheDocument()
    })

    it('searches titles and offers a way out when nothing matches', () => {
        renderJourney(<ExplorePage />, { route: '/learn/courses' })
        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
        expect(screen.getByText('No courses match')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }))
        expect(screen.getByText('Fire Safety')).toBeInTheDocument()
    })
})
