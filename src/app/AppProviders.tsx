import type { ReactNode } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import { PresenceProvider } from '@/contexts/PresenceContext'
import { PropertyProvider } from '@/contexts/PropertyContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { UserSettingsProvider } from '@/contexts/UserSettingsContext'
import { queryClient } from '@/lib/queryClient'

import { QueryRuntimeBridge } from './QueryRuntimeBridge'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <QueryRuntimeBridge />
      <ThemeProvider>
        <AuthProvider>
          <PropertyProvider>
            <UserSettingsProvider>
              <PresenceProvider>
                {children}
              </PresenceProvider>
            </UserSettingsProvider>
          </PropertyProvider>
        </AuthProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </ThemeProvider>
      <Toaster />
    </QueryClientProvider>
  )
}

