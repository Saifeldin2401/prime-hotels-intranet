import { useAuth } from '@/hooks/useAuth'
import { useAccountContext } from '@/hooks/useAccountContext'
import { consumePostLoginRedirect, getRedirectFromSearch, peekPostLoginRedirect } from '@/lib/authRedirect'
import { clearAuthFlowState, getAuthFlowRedirectPath } from '@/lib/authFlowState'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'

interface PublicOnlyRouteProps {
    children: React.ReactNode
}

// Generic landing targets are NOT real deep links — a stale one of these must not
// override the account-aware destination (an operator with a stored `/dashboard`
// redirect should still land on `/platform`).
const GENERIC_LANDINGS = new Set(['', '/', '/dashboard', '/home', '/home/learner'])
const isDeepLink = (p: string | null | undefined): p is string =>
    !!p && !GENERIC_LANDINGS.has(p.split('?')[0].replace(/\/$/, '') || '/')

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
    const { user, loading } = useAuth()
    const account = useAccountContext()
    const location = useLocation()
    const { t } = useTranslation('extracted')

    const pendingAuthFlowPath = getAuthFlowRedirectPath()
    const redirectPath = getRedirectFromSearch(location.search)
    const storedRedirect = peekPostLoginRedirect()

    // Honour a genuine deep-link (e.g. /knowledge/article/123) first; otherwise
    // route the user into the environment their account authorises, resolved
    // server-side by resolve_account_context().
    const deepLink = [pendingAuthFlowPath, redirectPath, storedRedirect].find(isDeepLink) ?? null
    const destination = user
        ? deepLink ?? account.recommendedDestination ?? '/dashboard'
        : null

    useEffect(() => {
        if (user && pendingAuthFlowPath) {
            clearAuthFlowState()
        }
        // Clear a stale generic stored redirect so it can't stick across logins.
        if (user && storedRedirect && !isDeepLink(storedRedirect)) {
            consumePostLoginRedirect()
        }
    }, [user, pendingAuthFlowPath, storedRedirect])

    if (loading || (user && account.loading)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
                    <p className="mt-4 text-muted-foreground">{t('loading', 'Loading...')}</p>
                </div>
            </div>
        )
    }

    if (user && destination) {
        return <Navigate to={destination} replace />
    }

    return <>{children}</>
}
