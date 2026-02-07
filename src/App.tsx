import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import { PropertyProvider } from '@/contexts/PropertyContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { router } from '@/routes/router'
import { UserSettingsProvider } from '@/contexts/UserSettingsContext'

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
          <AuthProvider>
            <PropertyProvider>
              <UserSettingsProvider>
                <NotificationProvider>
                  <RouterProvider router={router} />
                </NotificationProvider>
              </UserSettingsProvider>
            </PropertyProvider>
          </AuthProvider>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </ThemeProvider>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
