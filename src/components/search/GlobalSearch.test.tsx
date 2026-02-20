import { act, render } from '@testing-library/react'
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
        const { getByPlaceholderText } = render(<GlobalSearch />)
        const input = getByPlaceholderText('nav:search_placeholder') as HTMLInputElement
        act(() => {
            input.value = 'policy'
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input.dispatchEvent(new Event('change', { bubbles: true }))
            vi.advanceTimersByTime(350)
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
            vi.runOnlyPendingTimers()
        })

        expect(mockSaveSearch).toHaveBeenCalledWith('policy')
        expect(mockNavigate).toHaveBeenCalledWith('/policies')
    })
})
