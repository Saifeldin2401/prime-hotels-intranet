/**
 * Shared helpers for the six core-journey test suites.
 *
 * There is no e2e runner in this repo (no Playwright/Cypress in package.json), so the
 * journeys are exercised as component/integration tests with vitest + @testing-library
 * and a mocked Supabase backend. Steps that depend on features not yet built are marked
 * with `it.todo` in each suite.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'

export function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0, staleTime: 0 },
            mutations: { retry: false },
        },
    })
}

export function renderJourney(
    ui: ReactElement,
    { route = '/', ...options }: { route?: string } & RenderOptions = {},
) {
    const queryClient = makeQueryClient()
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </QueryClientProvider>
    )
    return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) }
}

/** A react-query result stub in its "success with data" state. */
export function queryOk<T>(data: T) {
    return {
        data,
        isLoading: false,
        isFetching: false,
        isError: false,
        error: null,
        isSuccess: true,
        refetch: () => Promise.resolve({ data }),
    }
}

/** A react-query result stub in its "loading" state. */
export function queryLoading() {
    return {
        data: undefined,
        isLoading: true,
        isFetching: true,
        isError: false,
        error: null,
        isSuccess: false,
        refetch: () => Promise.resolve({ data: undefined }),
    }
}
