import { useAuth } from '@/hooks/useAuth'
import { getRedirectFromSearch, peekPostLoginRedirect } from '@/lib/authRedirect'
import { clearAuthFlowState, getAuthFlowRedirectPath } from '@/lib/authFlowState'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'

interface PublicOnlyRouteProps {
    children: React.ReactNode
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
    const { user, loading, pendingMFAUserId } = useAuth()
    const location = useLocation()
    const { t } = useTranslation('extracted')

    const pendingAuthFlowPath = getAuthFlowRedirectPath()
    const redirectPath = getRedirectFromSearch(location.search)
    const storedRedirect = peekPostLoginRedirect()
    const destination = user && !pendingMFAUserId
        ? pendingAuthFlowPath ?? redirectPath ?? storedRedirect ?? '/home'
        : null

    useEffect(() => {
        if (user && !pendingMFAUserId && pendingAuthFlowPath) {
            clearAuthFlowState()
        }
    }, [user, pendingAuthFlowPath, pendingMFAUserId])

    if (loading) {
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
