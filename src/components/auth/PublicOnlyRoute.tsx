import { useAuth } from '@/hooks/useAuth'
import { useAccountContext } from '@/hooks/useAccountContext'
import { consumePostLoginRedirect, getRedirectFromSearch, peekPostLoginRedirect } from '@/lib/authRedirect'
import { clearAuthFlowState, getAuthFlowRedirectPath } from '@/lib/authFlowState'
import { safeLocalStorage, safeSessionStorage } from '@/lib/storage'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'

interface PublicOnlyRouteProps {
    children: React.ReactNode
}

// Generic landing targets are NOT real deep links — a stale one of these must not
// override the account-aware destination (an operator with a stored `/dashboard`
// redirect should still land on `/platform`).
const GENERIC_LANDINGS = new Set(['', '/', '/dashboard', '/home', '/learn'])
const isDeepLink = (p: string | null | undefined): p is string =>
    !!p && !GENERIC_LANDINGS.has(p.split('?')[0].replace(/\/$/, '') || '/')

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
    const { user, loading, signOut } = useAuth()
    const account = useAccountContext()
    const location = useLocation()
    const { t } = useTranslation('extracted')

    const pendingAuthFlowPath = getAuthFlowRedirectPath()
    const redirectPath = getRedirectFromSearch(location.search)
    const storedRedirect = peekPostLoginRedirect()

    const isRegisteredUser =
        account.isPlatformOperator ||
        account.tenantMemberships.length > 0 ||
        Boolean(account.primaryOrganizationId)

    // Unregistered users (e.g. external Google accounts not invited/provisioned by an admin)
    // are immediately signed out and have their local session state purged.
    useEffect(() => {
        if (user && !account.loading && !account.resolveFailed && !isRegisteredUser) {
            safeSessionStorage.removeItem('altus_session_active')
            safeLocalStorage.removeItem('altus_active_tenant_id')
            if (user?.id) {
                safeLocalStorage.removeItem(`active_tenant_id_${user.id}`)
            }
            void signOut()
        }
    }, [user, account.loading, account.resolveFailed, isRegisteredUser, signOut])

    // Honour a genuine deep-link (e.g. /knowledge/article/123) first; otherwise
    // route the user into the environment their account authorises, resolved
    // server-side by resolve_account_context().
    const deepLink = [pendingAuthFlowPath, redirectPath, storedRedirect].find(isDeepLink) ?? null
    let destination: string | null = null
    if (user && isRegisteredUser) {
        if (deepLink) {
            destination = deepLink
        } else if (account.isPlatformOperator && !account.activePlatformSession) {
            safeLocalStorage.removeItem('altus_active_tenant_id')
            if (user) safeLocalStorage.setItem(`active_tenant_id_${user.id}`, '__platform__')
            destination = '/platform'
        } else if (account.isMultiOrg) {
            const userKey = `active_tenant_id_${user.id}`
            const stored = safeLocalStorage.getItem(userKey)
            if (!stored || stored === '__platform__') {
                destination = '/select-tenant'
            } else {
                destination = account.recommendedDestination ?? '/dashboard'
            }
        } else {
            destination = account.recommendedDestination ?? '/dashboard'
        }
    }

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

    // Bounce unregistered users to /login with not_registered notice
    if (user && !account.loading && !account.resolveFailed && !isRegisteredUser) {
        const unregEmail = user.email ? encodeURIComponent(user.email) : ''
        const notRegisteredUrl = `/login?error=not_registered${unregEmail ? `&email=${unregEmail}` : ''}`
        if (location.pathname !== '/login' || !location.search.includes('error=not_registered')) {
            return <Navigate to={notRegisteredUrl} replace />
        }
    }

    if (user && isRegisteredUser && destination) {
        return <Navigate to={destination} replace />
    }

    return <>{children}</>
}
