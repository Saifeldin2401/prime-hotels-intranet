import { useQuery } from '@tanstack/react-query'

import { fetchPlatformExceptions } from './api'
import { groupPlatformExceptions } from './model'

export function usePlatformExceptions() {
  return useQuery({
    queryKey: ['platform-exceptions'],
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    queryFn: async () => groupPlatformExceptions(await fetchPlatformExceptions()),
  })
}
