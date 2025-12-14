import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

export default function PublicHome() {
    const { user: authUser } = useAuth()
    const navigate = useNavigate()
    const { t } = useTranslation('public')

    // Redirect authenticated users to their dashboard
    useEffect(() => {
        if (authUser) {
            navigate('/home', { replace: true })
        }
    }, [authUser, navigate])

    // Don't render if user is authenticated
    if (authUser) {
        return null
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Public Navigation */}
            <PublicNavbar />

            {/* Hero Section */}
            <section
                className="relative flex-1 bg-cover bg-center min-h-[calc(100vh-64px)]" // Full height minus header
                style={{ backgroundImage: 'url(/hero-banner.png)' }}
            >
                <div className="absolute inset-0 bg-hotel-navy/50" />
                <div className="relative h-full px-4 sm:px-8 lg:px-16 flex flex-col justify-center pt-20 sm:pt-32 lg:pt-48 pb-24">
                    <div className="text-white max-w-2xl">
                        <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 text-white leading-tight">
                            {t('welcome_title')} <br />
                            {t('prime_connect')}
                        </h1>
                        <p className="text-lg sm:text-xl lg:text-2xl text-white mb-6 sm:mb-8 font-light">
                            {t('subtitle')}
                        </p>

                        <Button
                            size="lg"
                            className="bg-hotel-gold hover:bg-hotel-gold-dark text-hotel-navy font-bold text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 h-auto w-full sm:w-auto min-h-[48px] touch-target"
                            onClick={() => navigate('/login')}
                        >
                            {t('login_button')}
                        </Button>
                    </div>
                </div>
            </section>

            {/* Simple Footer */}
            <footer className="bg-hotel-navy py-4 sm:py-6 text-center text-white/50 text-xs sm:text-sm pb-safe">
                <p>{t('footer', { year: new Date().getFullYear() })}</p>
            </footer>
        </div>
    )
}
