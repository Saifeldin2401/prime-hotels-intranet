import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Lock, Menu, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useBriefing } from '@/pages/public/PublicLayout';

export function PublicNavbar() {
  const { t, i18n } = useTranslation('public');
  const isRTL = i18n.dir() === 'rtl';
  const navigate = useNavigate();
  const { openBriefing } = useBriefing();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: t('nav.about', 'About'), href: '/about' },
    { label: t('nav.practices', 'Services'), href: '/about#practices' },
    { label: t('nav.ascent', 'Methodology'), href: '/methodology' },
    { label: t('nav.vision', 'Vision 2030'), href: '/vision-2030' },
    { label: t('nav.cases', 'Case Studies'), href: '/case-studies' },
    { label: t('nav.leadership', 'Leadership'), href: '/leadership' },
    { label: t('nav.digital', 'Digital & AI'), href: '/digital' },
    { label: t('nav.verify', 'Verify'), href: '/verify' },
  ];

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    if (href.includes('#')) {
      const [path, hash] = href.split('#');
      if (window.location.pathname === path || (path === '' && window.location.pathname === '/')) {
        const element = document.querySelector(`#${hash}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
    }
    navigate(href);
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'backdrop-blur-xl bg-[#16191E]/90 border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
          : 'backdrop-blur-md bg-[#16191E]/60 border-b border-white/5'
      }`}
    >
      {/* Art Deco Gold/Copper Accent Line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#C45B2F]/60 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <img
              src="/altus-emblem-icon.png"
              alt="ALTUS Advisory"
              className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span
              className="text-white leading-none"
              style={{ fontFamily: "'Canela', 'Playfair Display', Georgia, serif" }}
            >
              <span className="block text-xl tracking-wide font-normal">ALTUS</span>
              <span
                className="block text-[9px] tracking-[0.3em] text-[#C45B2F] font-bold mt-0.5"
                style={{ fontFamily: "'Neue Haas Grotesk', 'Plus Jakarta Sans', sans-serif" }}
              >
                ADVISORY
              </span>
            </span>
          </Link>

          {/* Desktop Navigation - Center */}
          <nav className="hidden lg:flex items-center gap-7">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className="text-slate-300 hover:text-[#E07A5F] text-[13px] font-medium tracking-wide transition-colors duration-300 relative py-1 after:absolute after:bottom-0 after:start-0 after:w-0 after:h-[2px] after:bg-[#C45B2F] hover:after:w-full after:transition-all after:duration-300"
                style={{ fontFamily: "'Neue Haas Grotesk', 'Plus Jakarta Sans', 'Inter', sans-serif" }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full text-xs font-semibold px-3 py-1.5 transition-colors"
              showLabel={false}
            />

            {/* Portal Login Button */}
            <Button
              onClick={() => navigate('/login')}
              variant="ghost"
              size="sm"
              className="hidden sm:flex h-9 px-3.5 text-[11px] font-semibold tracking-[0.15em] uppercase text-slate-300 hover:text-white hover:bg-white/10 rounded-none transition-colors duration-200"
              style={{ fontFamily: "'Neue Haas Grotesk', 'Plus Jakarta Sans', sans-serif" }}
            >
              <Lock className="w-3 h-3 me-1.5 text-slate-400" />
              {isRTL ? 'البوابة' : 'Portal'}
            </Button>

            {/* Gold/Copper CTA Button */}
            <Button
              onClick={openBriefing}
              size="sm"
              className="hidden sm:flex h-9 px-5 text-[11px] font-bold tracking-[0.15em] uppercase bg-[#C45B2F] hover:bg-[#D96B3D] text-white rounded-none transition-all duration-300 shadow-md shadow-[#C45B2F]/20 hover:shadow-lg hover:shadow-[#C45B2F]/40"
              style={{ fontFamily: "'Neue Haas Grotesk', 'Plus Jakarta Sans', sans-serif" }}
            >
              <Sparkles className="w-3 h-3 me-1.5 text-white/90" />
              {isRTL ? 'طلب إحاطة' : 'REQUEST BRIEFING'}
            </Button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6 text-[#E07A5F]" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#16191E]/98 backdrop-blur-2xl border-t border-white/10 rounded-b-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
            <nav className="py-4 px-2 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className="block w-full py-3 px-4 text-slate-200 hover:text-[#E07A5F] hover:bg-white/5 text-sm font-medium border-b border-white/5 last:border-0 text-start transition-colors rounded-lg"
                  style={{ fontFamily: "'Neue Haas Grotesk', 'Plus Jakarta Sans', sans-serif" }}
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-4 px-2 flex flex-col gap-2.5">
                <Button
                  onClick={() => { openBriefing(); setMobileMenuOpen(false); }}
                  className="w-full h-11 bg-[#C45B2F] hover:bg-[#D96B3D] text-white font-bold text-xs tracking-wider uppercase rounded-none shadow-md shadow-[#C45B2F]/25"
                  style={{ fontFamily: "'Neue Haas Grotesk', 'Plus Jakarta Sans', sans-serif" }}
                >
                  <Sparkles className="w-3.5 h-3.5 me-1.5" />
                  {isRTL ? 'طلب إحاطة شريك' : 'REQUEST BRIEFING'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                  className="w-full h-11 border-white/20 bg-white/5 text-white hover:bg-white/10 font-bold text-xs tracking-wider uppercase rounded-none"
                  style={{ fontFamily: "'Neue Haas Grotesk', 'Plus Jakarta Sans', sans-serif" }}
                >
                  <Lock className="w-3.5 h-3.5 me-1.5 text-slate-400" />
                  {isRTL ? 'الدخول إلى البوابة' : 'Access Portal'}
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export default PublicNavbar;

