import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

export function PublicNavbar() {
  const { t } = useTranslation('public')
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { label: t('nav.about', 'About'), href: '#about' },
    { label: t('nav.practices', 'Services'), href: '#practices' },
    { label: t('nav.platform', 'Platform'), href: '#platform' },
    { label: t('nav.ascent', 'Methodology'), href: '#ascent' },
    { label: t('nav.leadership', 'Leadership'), href: '#leadership' },
    { label: t('nav.portal', 'Portal'), href: '#portal' },
    { label: t('nav.verify', 'Verify'), href: '/verify' },
  ]

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false)
    if (href.startsWith('#')) {
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      navigate(href)
    }
  }

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled
        ? 'bg-[#1E2329]/90 backdrop-blur-[12px] border-b border-[#e4a4bd]/20 shadow-xl'
        : 'bg-[#1E2329]/60 backdrop-blur-md border-b border-white/5'
        }`}
    >

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img
              src="/altus-emblem-icon.png"
              alt=""
              className="h-9 w-auto object-contain"
            />
            <span
              className="text-white leading-none"
              style={{ fontFamily: "'Canela', 'Playfair Display', Georgia, serif" }}
            >
              <span className="block text-lg tracking-wide font-normal">ALTUS</span>
              <span
                className="block text-[9px] tracking-[0.3em] text-[#C45B2F] font-medium -mt-0.5"
                style={{ fontFamily: "'Neue Haas Grotesk', 'Plus Jakarta Sans', sans-serif" }}
              >
                ADVISORY
              </span>
            </span>
          </Link>

          {/* Desktop Navigation - Center */}
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className="text-white/70 hover:text-[#C45B2F] text-[13px] font-medium tracking-wide transition-colors duration-300"
                style={{ fontFamily: "'Neue Haas Grotesk', 'Plus Jakarta Sans', 'Inter', sans-serif" }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/5"
              showLabel={false}
            />

            <Button
              onClick={() => navigate('/login')}
              size="sm"
              className="hidden sm:flex h-9 px-5 text-[11px] font-semibold tracking-[0.15em] uppercase bg-transparent border border-[#C45B2F]/60 text-[#C45B2F] hover:bg-[#C45B2F]/10 hover:text-white rounded-none transition-[background-color,color] duration-200"
              style={{ fontFamily: "'Neue Haas Grotesk', 'Plus Jakarta Sans', sans-serif" }}
            >
              {t('nav.contact', 'Contact')}
            </Button>

            <Button
              onClick={() => navigate('/login')}
              size="sm"
              className="hidden sm:flex h-9 px-5 text-[11px] font-semibold tracking-[0.15em] uppercase bg-[#C45B2F] text-white hover:bg-[#C45B2F]/90 rounded-none transition-[background-color] duration-200 shadow-sm"
              style={{ fontFamily: "'Neue Haas Grotesk', 'Plus Jakarta Sans', sans-serif" }}
            >
              {t('login_button', 'REQUEST BRIEFING')}
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#1E2329]/98 backdrop-blur-md border-t border-white/10">
            <nav className="py-4 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className="block w-full py-3 px-2 text-white/80 hover:text-[#C45B2F] hover:bg-white/5 text-sm font-medium border-b border-white/5 last:border-0 text-start transition-colors"
                  style={{ fontFamily: "'Neue Haas Grotesk', 'Plus Jakarta Sans', sans-serif" }}
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-3 px-1 flex gap-2">
                <Button
                  onClick={() => { navigate('/login'); setMobileMenuOpen(false) }}
                  className="flex-1 h-10 bg-[#C45B2F] text-white font-semibold text-xs tracking-wider uppercase rounded-none"
                  style={{ fontFamily: "'Neue Haas Grotesk', 'Plus Jakarta Sans', sans-serif" }}
                >
                  {t('login_button', 'REQUEST BRIEFING')}
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
