import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'

export function PublicNavbar() {
  const { t, i18n } = useTranslation('public')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const isRTL = i18n.dir() === 'rtl'

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { label: t('nav.home'), href: '/' },
    { label: t('nav.features'), href: '#features' },
    { label: t('nav.verify'), href: '/verify' },
    { label: t('nav.about'), href: '#about' },
  ]

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false)
    if (href.startsWith('#')) {
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      window.location.href = href
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-hotel-navy/95 backdrop-blur-md shadow-lg'
          : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/prime-logo-light.png"
              alt="Prime Hotels"
              className="h-8 w-auto"
            />
            <div className="hidden sm:block">
              <div className="text-sm font-bold text-hotel-gold">PHG Connect</div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">
                {t('official_intranet')}
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className="text-white/80 hover:text-white text-sm font-medium transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher
              variant="ghost"
              className="text-white hover:bg-white/10"
              showLabel={false}
            />
            <Button
              onClick={() => window.location.href = '/login'}
              size="sm"
              className="hidden sm:flex bg-hotel-gold hover:bg-white hover:text-hotel-navy text-hotel-navy font-semibold px-5 rounded-full transition-all"
            >
              {t('login_button')}
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-hotel-navy/95 backdrop-blur-md border-t border-white/10">
            <nav className="py-4 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={`block w-full py-3 text-white/80 hover:text-white hover:bg-white/5 text-sm font-medium border-b border-white/5 last:border-0 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-3 px-1">
                <Button
                  onClick={() => window.location.href = '/login'}
                  className="w-full bg-hotel-gold hover:bg-white hover:text-hotel-navy text-hotel-navy font-semibold rounded-full"
                >
                  {t('login_button')}
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default PublicNavbar
