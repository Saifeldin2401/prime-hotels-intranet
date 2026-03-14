import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Header } from '@/components/layout/Header'
import { TooltipProvider } from '@/components/ui/tooltip'

// Mocks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    profile: { full_name: 'Test User' },
    primaryRole: 'staff',
    signOut: vi.fn()
  })
}))

vi.mock('@/contexts/PropertyContext', () => ({
  useProperty: () => ({
    currentProperty: { id: 'prop1', name: 'Test Property' },
    availableProperties: [],
    isMultiPropertyUser: false,
    switchProperty: vi.fn()
  })
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key
  })
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}))

vi.mock('@/components/notifications/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />
}))

vi.mock('@/components/search/GlobalSearch', () => ({
  GlobalSearch: () => <div data-testid="global-search" />
}))

describe('Header Accessibility', () => {
  it('renders sidebar toggle with aria-label', () => {
    render(
      <TooltipProvider>
        <Header sidebarCollapsed={false} setSidebarCollapsed={vi.fn()} />
      </TooltipProvider>
    )

    const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i })
    expect(toggleButton).toBeDefined()
    expect(toggleButton.getAttribute('aria-label')).toBe('Collapse sidebar')
  })

  it('renders expanded sidebar toggle with aria-label when collapsed', () => {
    render(
      <TooltipProvider>
        <Header sidebarCollapsed={true} setSidebarCollapsed={vi.fn()} />
      </TooltipProvider>
    )

    const toggleButton = screen.getByRole('button', { name: /expand sidebar/i })
    expect(toggleButton).toBeDefined()
    expect(toggleButton.getAttribute('aria-label')).toBe('Expand sidebar')
  })
})
