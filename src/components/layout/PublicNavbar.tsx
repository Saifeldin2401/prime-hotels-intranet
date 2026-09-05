import { Button } from '@/components/ui/button';
import { useBriefing } from '@/pages/public/PublicLayout';
import {
  Building2,
  ChevronDown,
  Compass,
  Cpu,
  Globe,
  Layers,
  Lock,
  Menu,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
  FileText,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export function PublicNavbar() {
  const { t, i18n } = useTranslation('public');
  const location = useLocation();
  const navigate = useNavigate();
  const { openBriefing } = useBriefing();

  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'firm' | 'services' | null>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize language and direction reliably
  useEffect(() => {
    const handleLangChange = (lng: string) => {
      setCurrentLang(lng);
    };
    i18n.on('languageChanged', handleLangChange);
    return () => {
      i18n.off('languageChanged', handleLangChange);
    };
  }, [i18n]);

  const isRTL = currentLang === 'ar' || currentLang.startsWith('ar') || i18n.dir() === 'rtl';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location.pathname, location.hash]);

  const toggleLanguage = () => {
    const nextLang = isRTL ? 'en' : 'ar';
    i18n.changeLanguage(nextLang).catch((err) => console.error('Language change failed:', err));
  };

  const handleMouseEnter = (menu: 'firm' | 'services') => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setActiveDropdown(menu);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
    if (href.includes('#')) {
      const [path, hash] = href.split('#');
      if (location.pathname === path || (path === '' && location.pathname === '/')) {
        const element = document.querySelector(`#${hash}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
    }
    navigate(href);
  };

  // Grouped Navigation Structure
  const firmItems = [
    {
      label: t('nav.about', isRTL ? 'عن ألتوس' : 'About Altus'),
      desc: t('nav.about_desc', isRTL ? 'ميثاق الأمانة وهندسة القيمة المؤسسية' : 'Mandate, philosophy & value engineering'),
      href: '/about',
      icon: Compass,
    },
    {
      label: t('nav.leadership', isRTL ? 'القيادة التنفيذية' : 'Executive Leadership'),
      desc: t('nav.leadership_desc', isRTL ? 'شركاء حاضرون ومسؤولون عن النتيجة' : 'Named, present, and accountable principals'),
      href: '/leadership',
      icon: Users,
    },
    {
      label: t('nav.vision', isRTL ? 'رؤية السعودية 2030' : 'Saudi Vision 2030'),
      desc: t('nav.vision_desc', isRTL ? 'التوافق الوطني ومواكبة طفرة الضيافة' : 'National alignment and tourism transformation'),
      href: '/vision-2030',
      icon: Sparkles,
    },
  ];

  const servicesItems = [
    {
      label: t('nav.practices', isRTL ? 'حلول الضيافة والأصول' : 'Hospitality Solutions'),
      desc: t('nav.practices_desc', isRTL ? 'تطوير الفنادق، ما قبل الافتتاح، وتعظيم RevPAR' : 'Asset operations, pre-opening & RevPAR growth'),
      href: '/about#practices',
      icon: Building2,
    },
    {
      label: t('nav.digital', isRTL ? 'الرقمنة والذكاء الاصطناعي' : 'Digital & Applied AI'),
      desc: t('nav.digital_desc', isRTL ? 'ذكاء الأعمال، إدارة العائد التنبؤية، والبيانات' : 'Business intelligence, predictive yield & data'),
      href: '/digital',
      icon: Cpu,
    },
    {
      label: t('nav.ascent', isRTL ? 'منهجية ألتوس أسنت™' : 'Altus Ascent™ Methodology'),
      desc: t('nav.ascent_desc', isRTL ? 'منهجية التحول والتشغيل من ٦ مراحل' : 'Proprietary 6-stage execution framework'),
      href: '/methodology',
      icon: Layers,
    },
  ];

  // Active check helpers
  const isFirmActive =
    location.pathname === '/about' ||
    location.pathname === '/leadership' ||
    location.pathname === '/vision-2030';

  const isServicesActive =
    (location.pathname === '/about' && location.hash === '#practices') ||
    location.pathname === '/digital' ||
    location.pathname === '/methodology';

  const isCasesActive = location.pathname === '/case-studies';
  const isVerifyActive = location.pathname.startsWith('/verify');

  const fontSans = isRTL
    ? "'Cairo', 'Tajawal', sans-serif"
    : "'Neue Haas Grotesk', 'Plus Jakarta Sans', 'Inter', sans-serif";

  const fontSerif = isRTL
    ? "'Cairo', 'Tajawal', sans-serif"
    : "'Canela', 'Playfair Display', Georgia, serif";

  return (
    <header
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#12161F] border-b border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.75)]'
          : 'bg-[#12161F] border-b border-white/5'
      }`}
      style={{ backgroundColor: '#12161F' }}
    >
      {/* Art Deco Gold/Copper Gradient Accent Line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#C45B2F]/80 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo & Brand Identity */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group py-1">
            <img
              src="/altus-emblem-icon.png"
              alt="ALTUS Advisory"
              className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span className="text-white leading-none text-start">
              <span
                className="block text-xl tracking-wide font-medium"
                style={{ fontFamily: fontSerif }}
              >
                {isRTL ? 'ألتوس' : 'ALTUS'}
              </span>
              <span
                className="block text-[9px] tracking-[0.3em] text-[#E07A5F] font-bold mt-0.5 uppercase"
                style={{ fontFamily: fontSans }}
              >
                {isRTL ? 'استشارات' : 'ADVISORY'}
              </span>
            </span>
          </Link>

          {/* ═══════════════ DESKTOP NAVIGATION (4 CONSOLIDATED TABS) ═══════════════ */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {/* 1. The Firm Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('firm')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'firm' ? null : 'firm')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold tracking-wide rounded-lg transition-[transform,color,background-color] duration-150 active:scale-[0.97] ${
                  isFirmActive
                    ? 'text-[#E07A5F] bg-white/[0.04]'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
                style={{ fontFamily: fontSans }}
                aria-expanded={activeDropdown === 'firm'}
              >
                <span>{t('nav.firm', isRTL ? 'المنظومة' : 'The Firm')}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                    activeDropdown === 'firm' ? 'rotate-180 text-[#E07A5F]' : ''
                  }`}
                />
              </button>

              {/* The Firm Dropdown Menu */}
              {activeDropdown === 'firm' && (
                <div
                  className="absolute top-full start-0 mt-2 w-80 bg-[#141820] border border-[#C45B2F]/40 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_20px_rgba(196,91,47,0.2)] animate-in fade-in-50 zoom-in-95 origin-top-start duration-150 z-50"
                  style={{ backgroundColor: '#141820' }}
                  onMouseEnter={() => handleMouseEnter('firm')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E07A5F] border-b border-white/5 mb-1" style={{ fontFamily: fontSans }}>
                    {isRTL ? 'أركان المنظومة' : 'FIRM PILLARS'}
                  </div>
                  {firmItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => handleNavClick(item.href)}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all duration-150 active:scale-[0.99] text-start group ${
                          isActive
                            ? 'bg-[#C45B2F]/15 border border-[#C45B2F]/40'
                            : 'hover:bg-white/[0.06] border border-transparent'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-[#C45B2F]/10 text-[#E07A5F] group-hover:scale-105 transition-transform shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-white group-hover:text-[#E07A5F] transition-colors" style={{ fontFamily: fontSans }}>
                            {item.label}
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-1 leading-relaxed mt-0.5">
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Services & AI Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('services')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'services' ? null : 'services')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold tracking-wide rounded-lg transition-[transform,color,background-color] duration-150 active:scale-[0.97] ${
                  isServicesActive
                    ? 'text-[#E07A5F] bg-white/[0.04]'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
                style={{ fontFamily: fontSans }}
                aria-expanded={activeDropdown === 'services'}
              >
                <span>{t('nav.services', isRTL ? 'الخدمات والذكاء' : 'Services & AI')}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                    activeDropdown === 'services' ? 'rotate-180 text-[#E07A5F]' : ''
                  }`}
                />
              </button>

              {/* Services Dropdown Menu */}
              {activeDropdown === 'services' && (
                <div
                  className="absolute top-full start-0 mt-2 w-84 bg-[#141820] border border-[#C45B2F]/40 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_20px_rgba(196,91,47,0.2)] animate-in fade-in-50 zoom-in-95 origin-top-start duration-150 z-50"
                  style={{ backgroundColor: '#141820' }}
                  onMouseEnter={() => handleMouseEnter('services')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E07A5F] border-b border-white/5 mb-1" style={{ fontFamily: fontSans }}>
                    {isRTL ? 'القدرات والعمليات' : 'OPERATIONAL CAPABILITIES'}
                  </div>
                  {servicesItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href.includes('#')
                        ? location.pathname === '/about' && location.hash === '#practices'
                        : location.pathname === item.href;
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => handleNavClick(item.href)}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all duration-150 active:scale-[0.99] text-start group ${
                          isActive
                            ? 'bg-[#C45B2F]/15 border border-[#C45B2F]/40'
                            : 'hover:bg-white/[0.06] border border-transparent'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-[#C45B2F]/10 text-[#E07A5F] group-hover:scale-105 transition-transform shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-white group-hover:text-[#E07A5F] transition-colors" style={{ fontFamily: fontSans }}>
                            {item.label}
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-1 leading-relaxed mt-0.5">
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Case Studies (Direct Tab) */}
            <button
              type="button"
              onClick={() => handleNavClick('/case-studies')}
              className={`px-3.5 py-2 text-[13px] font-semibold tracking-wide rounded-lg transition-[transform,color,background-color] duration-150 active:scale-[0.97] ${
                isCasesActive
                  ? 'text-[#E07A5F] bg-white/[0.04]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              }`}
              style={{ fontFamily: fontSans }}
            >
              {t('nav.cases', isRTL ? 'دراسات الحالة' : 'Case Studies')}
            </button>

            {/* 4. Verify Credentials (Direct Tab) */}
            <button
              type="button"
              onClick={() => handleNavClick('/verify')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold tracking-wide rounded-lg transition-[transform,color,background-color] duration-150 active:scale-[0.97] ${
                isVerifyActive
                  ? 'text-[#E07A5F] bg-white/[0.04]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              }`}
              style={{ fontFamily: fontSans }}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#E07A5F]" />
              <span>{t('nav.verify', isRTL ? 'التحقق' : 'Verify')}</span>
            </button>
          </nav>

          {/* ═══════════════ RIGHT ACTIONS (LANGUAGE, PORTAL, BRIEFING) ═══════════════ */}
          <div className="flex items-center gap-2.5">
            {/* Quick Language Toggle Pill */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-[#C45B2F]/40 text-xs font-semibold text-slate-200 hover:text-white transition-all duration-150 active:scale-[0.96] shadow-sm"
              title={isRTL ? 'Switch to English' : 'التبديل إلى العربية'}
              style={{ fontFamily: fontSans }}
            >
              <Globe className="w-3.5 h-3.5 text-[#E07A5F]" />
              <span>{isRTL ? 'English' : 'العربية'}</span>
            </button>

            {/* Portal Access Button */}
            <Button
              onClick={() => navigate('/login')}
              variant="ghost"
              size="sm"
              className="hidden sm:flex h-9 px-3.5 text-xs font-semibold tracking-wide text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-150 active:scale-[0.97]"
              style={{ fontFamily: fontSans }}
            >
              <Lock className="w-3.5 h-3.5 me-1.5 text-slate-400" />
              {t('nav.portal', isRTL ? 'الدخول المؤسسي' : 'Portal')}
            </Button>

            {/* Executive Briefing CTA Button */}
            <Button
              onClick={openBriefing}
              size="sm"
              className="hidden sm:flex h-9 px-4 sm:px-5 text-xs font-bold tracking-wider uppercase bg-[#C45B2F] hover:bg-[#D96B3D] text-white rounded-lg transition-all duration-200 active:scale-[0.97] shadow-md shadow-[#C45B2F]/25 hover:shadow-lg hover:shadow-[#C45B2F]/40 hover:-translate-y-0.5"
              style={{ fontFamily: fontSans }}
            >
              <Sparkles className="w-3 h-3 me-1.5 text-white/90" />
              {t('nav.briefing', isRTL ? 'طلب إحاطة شريك' : 'REQUEST BRIEFING')}
            </Button>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-transform duration-150 active:scale-[0.95]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6 text-[#E07A5F]" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* ═══════════════ MOBILE DRAWER MENU ═══════════════ */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden bg-[#12161F] border-t border-white/10 rounded-b-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[85vh] overflow-y-auto"
            style={{ fontFamily: fontSans, backgroundColor: '#12161F' }}
          >
            <nav className="p-4 space-y-4">
              {/* Section 1: The Firm */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#E07A5F] px-3 mb-1.5">
                  {t('nav.firm', isRTL ? 'المنظومة' : 'The Firm')}
                </div>
                <div className="space-y-1">
                  {firmItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => handleNavClick(item.href)}
                        className="flex items-center gap-3 w-full py-2.5 px-3 text-slate-200 hover:text-[#E07A5F] hover:bg-white/5 text-sm font-medium rounded-lg text-start transition-[background-color,color,transform] duration-150 active:scale-[0.98]"
                      >
                        <Icon className="w-4 h-4 text-[#E07A5F] shrink-0" />
                        <div>
                          <div>{item.label}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{item.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Services & AI */}
              <div className="border-t border-white/10 pt-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#E07A5F] px-3 mb-1.5">
                  {t('nav.services', isRTL ? 'الخدمات والذكاء' : 'Services & AI')}
                </div>
                <div className="space-y-1">
                  {servicesItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => handleNavClick(item.href)}
                        className="flex items-center gap-3 w-full py-2.5 px-3 text-slate-200 hover:text-[#E07A5F] hover:bg-white/5 text-sm font-medium rounded-lg text-start transition-[background-color,color,transform] duration-150 active:scale-[0.98]"
                      >
                        <Icon className="w-4 h-4 text-[#E07A5F] shrink-0" />
                        <div>
                          <div>{item.label}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{item.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Direct Links */}
              <div className="border-t border-white/10 pt-3 space-y-1">
                <button
                  type="button"
                  onClick={() => handleNavClick('/case-studies')}
                  className="flex items-center gap-3 w-full py-2.5 px-3 text-slate-200 hover:text-[#E07A5F] hover:bg-white/5 text-sm font-medium rounded-lg text-start transition-colors"
                >
                  <TrendingUp className="w-4 h-4 text-[#E07A5F] shrink-0" />
                  <span>{t('nav.cases', isRTL ? 'دراسات الحالة' : 'Case Studies')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('/verify')}
                  className="flex items-center gap-3 w-full py-2.5 px-3 text-slate-200 hover:text-[#E07A5F] hover:bg-white/5 text-sm font-medium rounded-lg text-start transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-[#E07A5F] shrink-0" />
                  <span>{t('nav.verify', isRTL ? 'التحقق من الشهادات' : 'Verify Credentials')}</span>
                </button>
              </div>

              {/* Actions in Mobile Menu */}
              <div className="border-t border-white/10 pt-4 flex flex-col gap-2.5">
                <Button
                  type="button"
                  onClick={() => {
                    openBriefing();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full h-11 bg-[#C45B2F] hover:bg-[#D96B3D] text-white font-bold text-xs tracking-wider uppercase rounded-xl shadow-md shadow-[#C45B2F]/25"
                >
                  <Sparkles className="w-3.5 h-3.5 me-2" />
                  {t('nav.briefing', isRTL ? 'طلب إحاطة شريك' : 'REQUEST BRIEFING')}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigate('/login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full h-11 border-white/20 bg-white/5 text-white hover:bg-white/10 font-semibold text-xs tracking-wider uppercase rounded-xl"
                >
                  <Lock className="w-3.5 h-3.5 me-2 text-slate-400" />
                  {t('nav.portal', isRTL ? 'الدخول المؤسسي' : 'Portal Access')}
                </Button>

                {/* Mobile Language Switcher Button */}
                <button
                  type="button"
                  onClick={() => {
                    toggleLanguage();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 px-3 text-center text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-2 mt-1"
                >
                  <Globe className="w-3.5 h-3.5 text-[#E07A5F]" />
                  <span>{isRTL ? 'Switch to English' : 'التبديل إلى اللغة العربية'}</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export default PublicNavbar;
