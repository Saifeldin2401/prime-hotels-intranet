import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PendingApprovalsWidget } from '@/components/widgets/PendingApprovalsWidget'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BrowserRouter } from 'react-router-dom'

// Mock the hooks
vi.mock('@/hooks/useApprovalStats', () => ({
    useApprovalStats: () => ({ data: { total_pending: 2 } }),
    usePendingApprovals: () => ({
        data: [
            {
                id: '1',
                type: 'annual',
                start_date: '2024-01-01',
                end_date: '2024-01-05',
                created_at: '2023-12-25',
                requester: { full_name: 'John Doe' }
            }
        ],
        isLoading: false
    })
}))

vi.mock('@/hooks/useLeaveRequests', () => ({
    useApproveLeaveRequest: () => ({ mutate: vi.fn(), isPending: false }),
    useRejectLeaveRequest: () => ({ mutate: vi.fn(), isPending: false })
}))

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { dir: () => 'ltr' }
    })
}))

describe('PendingApprovalsWidget UX/Accessibility', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('Approve and Reject buttons have correct aria-labels and tooltips', async () => {
        render(
            <BrowserRouter>
                <TooltipProvider>
                    <PendingApprovalsWidget />
                </TooltipProvider>
            </BrowserRouter>
        )

        // FindJohn Doe's request
        expect(await screen.findByText('John Doe')).toBeDefined()

        // Check Approve button
        const approveButton = screen.getByLabelText('approve')
        expect(approveButton).toBeDefined()
        expect(approveButton).toHaveAttribute('aria-label', 'approve')

        // Test Approve tooltip
        fireEvent.mouseEnter(approveButton)
        expect(await screen.findByText('approve')).toBeDefined()

        // Check Reject button
        const rejectButton = screen.getByLabelText('reject')
        expect(rejectButton).toBeDefined()
        expect(rejectButton).toHaveAttribute('aria-label', 'reject')

        // Test Reject tooltip
        fireEvent.mouseEnter(rejectButton)
        expect(await screen.findByText('reject')).toBeDefined()
    })
})
