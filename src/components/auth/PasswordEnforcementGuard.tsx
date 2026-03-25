
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface PasswordEnforcementGuardProps {
    children: React.ReactNode
}

export function PasswordEnforcementGuard({ children }: PasswordEnforcementGuardProps) {
    const { user, profile, loading } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        if (loading || !user || !profile) return

        const isOnResetPasswordPage =
            location.pathname === '/reset-password' ||
            location.pathname.startsWith('/reset-password/')

        // Never interfere with the standalone reset-password flow
        if (isOnResetPasswordPage) return

        const isOnCompleteInvitePage =
            location.pathname === '/complete-invite' ||
            location.pathname.startsWith('/complete-invite/')

        const needsInviteProfileCompletion =
            profile.force_password_reset === true &&
            profile.password_initialized === false &&
            (!profile.full_name || !profile.date_of_birth)

        if (needsInviteProfileCompletion && !isOnCompleteInvitePage) {
            navigate('/complete-invite', { replace: true })
            return
        }

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
