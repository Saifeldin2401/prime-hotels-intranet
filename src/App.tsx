import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import { PropertyProvider } from '@/contexts/PropertyContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { PageTracker } from '@/components/analytics/PageTracker'
import { AppRoutes } from '@/routes/AppRoutes'
import { SessionTimeoutWarning } from '@/components/ui/SessionTimeoutWarning'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <PageTracker />
            <AuthProvider>
              <PropertyProvider>
                <NotificationProvider>
                  <AppRoutes />
                  <SessionTimeoutWarning />
                </NotificationProvider>
              </PropertyProvider>
            </AuthProvider>
          </BrowserRouter>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </ThemeProvider>
        <Toaster />
        <Analytics />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
