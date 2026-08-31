import { useAuth } from '@/hooks/useAuth'
import { useAccountContext } from '@/hooks/useAccountContext'
import { getRedirectFromSearch, peekPostLoginRedirect } from '@/lib/authRedirect'
import { clearAuthFlowState, getAuthFlowRedirectPath } from '@/lib/authFlowState'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'

interface PublicOnlyRouteProps {
    children: React.ReactNode
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
    const { user, loading } = useAuth()
    const account = useAccountContext()
    const location = useLocation()
    const { t } = useTranslation('extracted')

    const pendingAuthFlowPath = getAuthFlowRedirectPath()
    const redirectPath = getRedirectFromSearch(location.search)
    const storedRedirect = peekPostLoginRedirect()
    // Smart landing: honour an explicit deep-link first, otherwise route the user
    // into the environment their account authorises (operator / org admin /
    // trainer / learner) as resolved server-side by resolve_account_context().
    const destination = user
        ? pendingAuthFlowPath ?? redirectPath ?? storedRedirect ?? account.recommendedDestination ?? '/dashboard'
        : null

    useEffect(() => {
        if (user && pendingAuthFlowPath) {
            clearAuthFlowState()
        }
    }, [user, pendingAuthFlowPath])

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
