import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GlobalSearch } from '@/components/search/GlobalSearch'

const mockNavigate = vi.fn()
const mockUseSearch = vi.fn()
const mockUseSearchSuggestions = vi.fn()
const mockGetRecentSearches = vi.fn(() => ['Handbook'])
const mockSaveSearch = vi.fn()

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate
    }
})

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: string) => fallback || key
    })
}))

vi.mock('@/hooks/useSearch', () => ({
    useSearch: (...args: unknown[]) => mockUseSearch(...args),
    useSearchSuggestions: (...args: unknown[]) => mockUseSearchSuggestions(...args),
    useRecentSearches: () => ({
        getRecentSearches: mockGetRecentSearches,
        saveSearch: mockSaveSearch
    })
}))

describe('GlobalSearch', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        mockUseSearch.mockReturnValue({
            results: [{ id: 'result-1', type: 'page', title: 'Policies', url: '/policies' }],
            isLoading: false,
            hasResults: true
        })
        mockUseSearchSuggestions.mockReturnValue({ suggestions: [] })
    })

    afterEach(() => {
        act(() => {
            vi.runOnlyPendingTimers()
        })
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    it('supports keyboard selection flow and navigates to selected result', async () => {
        render(<GlobalSearch />)

        const input = screen.getByPlaceholderText('nav:search_placeholder')
        act(() => {
            fireEvent.change(input, { target: { value: 'policy' } })
            vi.advanceTimersByTime(350)
            fireEvent.keyDown(input, { key: 'ArrowDown' })
            fireEvent.keyDown(input, { key: 'Enter' })
            vi.runOnlyPendingTimers()
        })

        expect(mockSaveSearch).toHaveBeenCalledWith('policy')
        expect(mockNavigate).toHaveBeenCalledWith('/policies')
    })
})
