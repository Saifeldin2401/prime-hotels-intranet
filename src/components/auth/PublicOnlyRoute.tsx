import { useAuth } from '@/hooks/useAuth'
import { getRedirectFromSearch, consumePostLoginRedirect } from '@/lib/authRedirect'
import { getAuthFlowRedirectPath } from '@/lib/authFlowState'
import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

interface PublicOnlyRouteProps {
    children: React.ReactNode
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
    const { user, loading } = useAuth()
    const location = useLocation()
    
    // We capture it once on mount or when auth state changes from unauthenticated to authenticated
    const [destination, setDestination] = useState<string | null>(null)
    
    useEffect(() => {
        if (user && !destination) {
            const pendingAuthFlowPath = getAuthFlowRedirectPath()
            const urlRedirect = getRedirectFromSearch(location.search)
            const sessionRedirect = consumePostLoginRedirect()
            setDestination(pendingAuthFlowPath ?? urlRedirect ?? sessionRedirect ?? "/home")
        }
    }, [user, destination, location.search])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (user && destination) {
        return <Navigate to={destination} replace />
    } else if (user) {
        // Fallback if effect hasn't fired yet but user is true
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    return <>{children}</>
}
