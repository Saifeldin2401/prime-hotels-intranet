import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { GraduationCap, TrendingUp, Users } from 'lucide-react'
import aboutTeamImg from '@/assets/about-team.png'

export default function PublicHome() {
    const { user: authUser } = useAuth()
    const navigate = useNavigate()
    const { t, i18n } = useTranslation('public')
    const isRTL = i18n.dir() === 'rtl'

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
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Public Navigation */}
            <PublicNavbar />

            {/* Hero Section */}
            <section
                className="relative h-[90vh] bg-cover bg-center flex items-center overflow-hidden"
                style={{ backgroundImage: 'url(/hero-banner.png)' }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-hotel-navy/95 via-hotel-navy/70 to-transparent" />

                {/* Decorative overlay pattern */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 w-full pt-16" dir="ltr">
                    <div className="max-w-3xl animate-fade-in text-left">
                        <div className="inline-block px-3 py-1 mb-6 border border-hotel-gold/30 rounded-full bg-hotel-navy/50 backdrop-blur-sm">
                            <span className="text-hotel-gold text-sm font-medium tracking-wider uppercase">
                                {t('prime_connect')}
                            </span>
                        </div>
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight font-serif tracking-tight drop-shadow-sm">
                            {t('welcome_title')} <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-hotel-gold via-yellow-200 to-hotel-gold">
                                {t('prime_connect')}
                            </span>
                        </h1>
                        <p className="text-xl sm:text-2xl text-gray-200 mb-10 font-light leading-relaxed max-w-2xl drop-shadow-sm">
                            {t('subtitle')}
                        </p>

                        <div className="flex gap-4">
                            <Button
                                size="lg"
                                className="bg-hotel-gold hover:bg-white hover:text-hotel-navy text-hotel-navy font-bold text-lg px-8 py-7 h-auto shadow-2xl transition-all duration-300 transform hover:-translate-y-1 rounded-full border-2 border-transparent hover:border-white"
                                onClick={() => navigate('/login')}
                            >
                                {t('login_button')}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Who We Are Section - Modern Split Layout */}
            <section className="py-24 bg-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className={`relative ${isRTL ? 'lg:order-last' : ''}`}>
                            <div className="absolute -top-10 -left-10 w-40 h-40 bg-hotel-gold/10 rounded-full blur-3xl rounded-bl-none"></div>
                            <h2 className="text-4xl font-bold text-hotel-navy mb-8 font-serif leading-tight">
                                {t('who_we_are.title')}
                            </h2>
                            <div className="w-20 h-1.5 bg-hotel-gold mb-8 rounded-full" />
                            <p className="text-xl text-gray-600 leading-loose">
                                {t('who_we_are.mission')}
                            </p>
                        </div>

                        {/* Visual Image */}
                        <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl group">
                            <img
                                src={aboutTeamImg}
                                alt={t('who_we_are.title')}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-hotel-navy/10 mix-blend-multiply group-hover:bg-hotel-navy/0 transition-colors duration-500"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Growing Together Section - Premium Cards */}
            <section className="py-24 bg-slate-50 border-t border-slate-100 relative">
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-gray-100 to-transparent opacity-50"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-20 max-w-3xl mx-auto">
                        <span className="text-hotel-gold font-bold tracking-[0.2em] uppercase text-sm mb-3 block">
                            {t('growing_together.subtitle')}
                        </span>
                        <h2 className="text-4xl font-bold text-hotel-navy font-serif mb-4">{t('growing_together.title')}</h2>
                        <p className="text-gray-500 mt-4">{t('growing_together.tagline')}</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-transparent hover:border-hotel-gold/20 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <GraduationCap size={80} className="text-hotel-navy" />
                            </div>
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                                <GraduationCap className="w-8 h-8 text-hotel-navy" />
                            </div>
                            <h3 className="text-2xl font-bold text-hotel-navy mb-4 group-hover:text-hotel-gold transition-colors duration-300">
                                {t('growing_together.learning.title')}
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                {t('growing_together.learning.desc')}
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-transparent hover:border-hotel-gold/20 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <TrendingUp size={80} className="text-hotel-navy" />
                            </div>
                            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                                <TrendingUp className="w-8 h-8 text-hotel-gold" />
                            </div>
                            <h3 className="text-2xl font-bold text-hotel-navy mb-4 group-hover:text-hotel-gold transition-colors duration-300">
                                {t('growing_together.leadership.title')}
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                {t('growing_together.leadership.desc')}
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-transparent hover:border-hotel-gold/20 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Users size={80} className="text-hotel-navy" />
                            </div>
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                                <Users className="w-8 h-8 text-hotel-navy" />
                            </div>
                            <h3 className="text-2xl font-bold text-hotel-navy mb-4 group-hover:text-hotel-gold transition-colors duration-300">
                                {t('growing_together.community.title')}
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                {t('growing_together.community.desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Simple Footer */}
            <footer className="bg-hotel-navy py-12 text-center border-t border-white/10">
                <div className="max-w-7xl mx-auto px-4">
                    <p className="text-white/40 text-sm">{t('footer', { year: new Date().getFullYear() })}</p>
                </div>
            </footer>
        </div>
    )
}
