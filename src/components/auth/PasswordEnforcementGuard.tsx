
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface PasswordEnforcementGuardProps {
    children: React.ReactNode
}

export function PasswordEnforcementGuard({ children }: PasswordEnforcementGuardProps) {
    const { user, profile, loading } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        if (loading || !user || !profile) return

        // If active temp password
        const isTempPassword = profile.is_temp_password
        const isOnChangePasswordPage = location.pathname === '/change-password'

        // Check if wizard is pending (means password was just changed)
        const wizardPending = localStorage.getItem('prime_wizard_pending') === 'true'

        // If temp password AND not on change password page AND wizard not pending
        // (wizard pending means they just changed password, so allow navigation)
        if (isTempPassword && !isOnChangePasswordPage && !wizardPending) {
            // Block access to everything else
            navigate('/change-password', { replace: true })
        }

        // Determine if user is attempting to access Change Password page while NOT needing to
        // (Optional: we can allow them to access it manually, but we should prevent loops)
        // If NOT temp password and accessing Change Password page? 
        // We allow it (Self-Service).

    }, [user, profile, loading, navigate, location.pathname])

    if (loading) {
        // Show a minimal loading state while checking
        return null
    }

    return <>{children}</>
}
