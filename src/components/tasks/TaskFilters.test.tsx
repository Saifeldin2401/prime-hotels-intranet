import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { TaskFilters } from './TaskFilters'
import { TooltipProvider } from '@/components/ui/tooltip'

// Mocking dependencies
vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(() => ({
        data: [],
        isLoading: false
    }))
}))

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
                    }))
                }))
            }))
        }))
    }
}))

vi.mock('@/contexts/PropertyContext', () => ({
    useProperty: vi.fn(() => ({
        currentProperty: { id: 'prop-1' }
    }))
}))

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key
    })
}))

describe('TaskFilters', () => {
    const defaultProps = {
        filters: {},
        onChange: vi.fn()
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders search input with correct aria-label', () => {
        render(
            <TooltipProvider>
                <TaskFilters {...defaultProps} />
            </TooltipProvider>
        )
        const searchInput = screen.getByLabelText('search_placeholder')
        expect(searchInput).toBeDefined()
        expect(searchInput.getAttribute('placeholder')).toBe('search_placeholder')
    })

    it('renders clear filters button with aria-label when filters are present', () => {
        const filters = { priority: 'high' }
        render(
            <TooltipProvider>
                <TaskFilters {...defaultProps} filters={filters} />
            </TooltipProvider>
        )

        const clearButton = screen.getByLabelText('common:clear_filters')
        expect(clearButton).toBeDefined()
    })

    it('does not render clear filters button when no filters are present', () => {
        render(
            <TooltipProvider>
                <TaskFilters {...defaultProps} />
            </TooltipProvider>
        )

        const clearButton = screen.queryByLabelText('common:clear_filters')
        expect(clearButton).toBeNull()
    })
})
