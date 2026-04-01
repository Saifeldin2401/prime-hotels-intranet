import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false
        const status = Number((error as { status?: number })?.status ?? 0)
        return status === 0 || status >= 500
      },
    },
  },
})
