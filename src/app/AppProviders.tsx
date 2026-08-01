import { lazy, Suspense, type ReactNode } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'

import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import { PresenceProvider } from '@/contexts/PresenceContext'
import { PropertyProvider } from '@/contexts/PropertyContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { UserSettingsProvider } from '@/contexts/UserSettingsContext'
import { queryClient } from '@/lib/queryClient'
import { ThemeProvider as AltusKitThemeProvider } from '@/altus-kit/theme'

import { QueryRuntimeBridge } from './QueryRuntimeBridge'

// Dev-only: lazily loaded so it is never bundled into production builds.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools }))
    )
  : null

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <QueryRuntimeBridge />
      <ThemeProvider>
        <AltusKitThemeProvider>
          <AuthProvider>
            <PropertyProvider>
              <UserSettingsProvider>
                <PresenceProvider>
                  {children}
                </PresenceProvider>
              </UserSettingsProvider>
            </PropertyProvider>
          </AuthProvider>
        </AltusKitThemeProvider>
        {ReactQueryDevtools && (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        )}
      </ThemeProvider>
      <Toaster />
    </QueryClientProvider>
  )
}

