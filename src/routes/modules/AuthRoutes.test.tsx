import { render, screen } from '@testing-library/react'
import { createMemoryRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/auth/PublicOnlyRoute', () => ({
  PublicOnlyRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/pages/Login', () => ({
  default: () => <div data-testid="login-page">Login</div>,
}))

vi.mock('@/pages/auth/ForgotPassword', () => ({
  default: () => <div data-testid="forgot-password-page">Forgot Password</div>,
}))

vi.mock('@/pages/auth/ResetPassword', () => ({
  default: () => <div data-testid="reset-password-page">Reset Password</div>,
}))

vi.mock('@/pages/auth/CompleteInvite', () => ({
  default: () => <div data-testid="complete-invite-page">Complete Invite</div>,
}))

vi.mock('@/pages/auth/ChangePassword', () => ({
  default: () => <div data-testid="change-password-page">Change Password</div>,
}))

vi.mock('@/pages/Unauthorized', () => ({
  default: () => <div data-testid="unauthorized-page">Unauthorized</div>,
}))

import { AuthRoutes, StandaloneAuthRoutes } from './AuthRoutes'

function renderRoutes(routes: React.ReactNode, initialEntry: string) {
  const router = createMemoryRouter(
    createRoutesFromElements(
      <>
        {routes}
        <Route path="*" element={<div data-testid="fallback-page">Fallback</div>} />
      </>
    ),
    { initialEntries: [initialEntry] }
  )

  return render(<RouterProvider router={router} />)
}

describe('AuthRoutes', () => {
  it('renders reset-password from the standalone auth route group', async () => {
    renderRoutes(StandaloneAuthRoutes(), '/reset-password?token_hash=abc&type=recovery')

    expect(await screen.findByTestId('reset-password-page')).toBeInTheDocument()
    expect(screen.queryByTestId('fallback-page')).not.toBeInTheDocument()
  })

  it('does not include reset-password in the protected auth route group', async () => {
    renderRoutes(AuthRoutes(), '/reset-password?token_hash=abc&type=recovery')

    expect(await screen.findByTestId('fallback-page')).toBeInTheDocument()
    expect(screen.queryByTestId('reset-password-page')).not.toBeInTheDocument()
  })
})
