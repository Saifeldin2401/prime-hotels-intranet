import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { PreserveQueryNavigate } from './utils/QueryPreserveRedirect'
import { sanitizeRedirectPath, buildLoginUrl, getSpaRedirectFromSearch } from '@/lib/authRedirect'

// Helper component that prints the current location to the screen for testing
function LocationDisplay() {
  const location = useLocation()
  return (
    <div>
      <span data-testid="pathname">{location.pathname}</span>
      <span data-testid="search">{location.search}</span>
      <span data-testid="hash">{location.hash}</span>
    </div>
  )
}

describe('Redirects and URL Resolution Suite', () => {
  describe('PreserveQueryNavigate', () => {
    it('preserves search parameters and hash fragments during redirection', () => {
      render(
        <MemoryRouter initialEntries={['/social?filter=recent&page=2#top']}>
          <Routes>
            <Route path="/social" element={<PreserveQueryNavigate to="/announcements" />} />
            <Route path="/announcements" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByTestId('pathname').textContent).toBe('/announcements')
      expect(screen.getByTestId('search').textContent).toBe('?filter=recent&page=2')
      expect(screen.getByTestId('hash').textContent).toBe('#top')
    })

    it('merges existing destination query params with current location query params cleanly without duplicate keys', () => {
      render(
        <MemoryRouter initialEntries={['/training?tab=overview&page=1']}>
          <Routes>
            <Route path="/training" element={<PreserveQueryNavigate to="/training/hub?view=list" />} />
            <Route path="/training/hub" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByTestId('pathname').textContent).toBe('/training/hub')
      const search = screen.getByTestId('search').textContent || ''
      expect(search).toContain('view=list')
      expect(search).toContain('tab=overview')
      expect(search).toContain('page=1')
    })
  })

  describe('Legacy Route Aliases and SOP Redirects', () => {
    it('redirects /support to /knowledge while preserving query and hash', () => {
      render(
        <MemoryRouter initialEntries={['/support?q=housekeeping#section-3']}>
          <Routes>
            <Route path="/support" element={<PreserveQueryNavigate to="/knowledge" />} />
            <Route path="/knowledge" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByTestId('pathname').textContent).toBe('/knowledge')
      expect(screen.getByTestId('search').textContent).toBe('?q=housekeeping')
      expect(screen.getByTestId('hash').textContent).toBe('#section-3')
    })

    it('redirects /operations/sops to /knowledge while preserving query', () => {
      render(
        <MemoryRouter initialEntries={['/operations/sops?category=safety']}>
          <Routes>
            <Route path="/operations/sops" element={<PreserveQueryNavigate to="/knowledge" />} />
            <Route path="/knowledge" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByTestId('pathname').textContent).toBe('/knowledge')
      expect(screen.getByTestId('search').textContent).toBe('?category=safety')
    })

    it('redirects /hr/leave-requests to /hr/leave and /hr/staff to /directory', () => {
      render(
        <MemoryRouter initialEntries={['/hr/leave-requests?status=pending']}>
          <Routes>
            <Route path="/hr/leave-requests" element={<PreserveQueryNavigate to="/hr/leave" />} />
            <Route path="/hr/leave" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByTestId('pathname').textContent).toBe('/hr/leave')
      expect(screen.getByTestId('search').textContent).toBe('?status=pending')
    })
  })

  describe('Auth Redirection Security and Sanitization', () => {
    it('sanitizes unsafe external redirect URLs to prevent open-redirect vulnerabilities', () => {
      expect(sanitizeRedirectPath('https://evil.com/phishing')).toBeNull()
      expect(sanitizeRedirectPath('//evil.com')).toBeNull()
      expect(sanitizeRedirectPath('javascript:alert(1)')).toBeNull()
      expect(sanitizeRedirectPath('/admin/users?role=manager')).toBe('/admin/users?role=manager')
      expect(sanitizeRedirectPath('/operations/tasks#assigned')).toBe('/operations/tasks#assigned')
    })

    it('builds clean login target URLs with encoded redirect destinations', () => {
      const loginUrl = buildLoginUrl('/hr/attendance', '?month=08', '#calendar')
      expect(loginUrl).toBe('/login?redirect=' + encodeURIComponent('/hr/attendance?month=08#calendar'))
    })

    it('extracts SPA redirect params cleanly from 404.html single-page application fallback queries', () => {
      const spaQuery = '?__redirect=' + encodeURIComponent('/dashboard/metrics?year=2026')
      const extracted = getSpaRedirectFromSearch(spaQuery)
      expect(extracted).toBe('/dashboard/metrics?year=2026')
    })
  })
})
