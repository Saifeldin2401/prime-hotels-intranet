import aboutTeamImg from '@/assets/about-team.png';
import { getAuthFlowRedirectPath } from '@/lib/authFlowState';
import {
  AUTH_ROUTE_RECOVERY_MESSAGE,
  buildCanonicalUrl,
  clearPrimeHotelServiceWorkersAndCaches,
  normalizePathname,
  shouldProtectAuthEntry,
} from '@/lib/runtimeRecovery';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
    AlertCircle,
    ArrowRight,
    Award,
    BookOpen,
    Calendar,
    CheckCircle2,
    FileText,
    Globe,
    GraduationCap,
    Headphones,
    HelpCircle,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    RefreshCw,
    Shield,
    ShieldCheck,
    TrendingUp,
    Users,
    Zap
} from 'lucide-react';
import { lazy, Suspense, useEffect, useState, type ElementType } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const InviteRouteRescue = lazy(() => import('@/pages/auth/CompleteInvite'))
const ResetRouteRescue = lazy(() => import('@/pages/auth/ResetPassword'))

export default function PublicHome() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('public');
  const isRTL = i18n.dir() === 'rtl';
  const currentPathname = normalizePathname(window.location.pathname)
  const pendingAuthFlowPath = getAuthFlowRedirectPath()
  const isInvitePath = currentPathname === '/complete-invite' || currentPathname.startsWith('/complete-invite/')
  const isResetPath = currentPathname === '/reset-password' || currentPathname.startsWith('/reset-password/')
  const secureEntryRecoveryNeeded = shouldProtectAuthEntry(
    window.location.pathname,
    window.location.search,
    window.location.hash,
  )
  const [secureEntryRecoveryFailed, setSecureEntryRecoveryFailed] = useState(false)

  useEffect(() => {
    if (secureEntryRecoveryNeeded) {
      let cancelled = false
      const recoveryKey = '__public_home_auth_entry_recovery__'

      const runRecovery = async () => {
        try {
          const alreadyAttempted = (() => {
            try {
              return sessionStorage.getItem(recoveryKey) === '1'
            } catch {
              return false
            }
          })()
          if (alreadyAttempted) {
            if (!cancelled) {
              setSecureEntryRecoveryFailed(true)
            }
            return
          }

          try {
            sessionStorage.setItem(recoveryKey, '1')
          } catch {
            // Ignore storage errors and continue recovery.
          }

          const clearedArtifacts = await clearPrimeHotelServiceWorkersAndCaches()
          if (!cancelled && clearedArtifacts) {
            window.location.replace(
              buildCanonicalUrl(window.location.pathname, window.location.search, window.location.hash)
            )
            return
          }
        } catch {
          // Fall through to the recovery UI below.
        }

        if (!cancelled) {
          setSecureEntryRecoveryFailed(true)
        }
      }

      void runRecovery()

      return () => {
        cancelled = true
      }
    }

    if (authUser) {
      if (pendingAuthFlowPath) {
        navigate(pendingAuthFlowPath, { replace: true });
        return
      }
      navigate('/home', { replace: true });
    }
  }, [authUser, navigate, pendingAuthFlowPath, secureEntryRecoveryNeeded]);

  if (secureEntryRecoveryNeeded) {
    if (secureEntryRecoveryFailed && (isInvitePath || isResetPath)) {
      const RescueComponent = isInvitePath ? InviteRouteRescue : ResetRouteRescue

      return (
        <Suspense
          fallback={(
            <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-500" />
                <p className="mt-3 text-sm text-slate-600">{AUTH_ROUTE_RECOVERY_MESSAGE}</p>
              </div>
            </div>
          )}
        >
          <RescueComponent />
        </Suspense>
      )
    }

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            {secureEntryRecoveryFailed ? <AlertCircle className="h-7 w-7" /> : <RefreshCw className="h-7 w-7 animate-spin" />}
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              {secureEntryRecoveryFailed ? 'Secure link recovery needed' : 'Recovering secure link'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {secureEntryRecoveryFailed
                ? `PHG Connect detected an unexpected public-page render on ${currentPathname}. Retry the secure link to continue account setup.`
                : AUTH_ROUTE_RECOVERY_MESSAGE}
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            <Button
              className="w-full"
              onClick={async () => {
                await clearPrimeHotelServiceWorkersAndCaches()
                window.location.replace(
                  buildCanonicalUrl(window.location.pathname, window.location.search, window.location.hash)
                )
              }}
            >
              <RefreshCw className="me-2 h-4 w-4" />
              Retry Secure Link
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
              Access Portal
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (authUser) {
    return null;
  }

  const features = [
    {
      icon: GraduationCap,
      title: t('features.learning.title'),
      description: t('features.learning.desc'),
    },
    {
      icon: TrendingUp,
      title: t('features.hr.title'),
      description: t('features.hr.desc'),
    },
    {
      icon: Users,
      title: t('features.community.title'),
      description: t('features.community.desc'),
    },
    {
      icon: Shield,
      title: t('features.security.title'),
      description: t('features.security.desc'),
    },
    {
      icon: Zap,
      title: t('features.performance.title'),
      description: t('features.performance.desc'),
    },
    {
      icon: Globe,
      title: t('features.accessibility.title'),
      description: t('features.accessibility.desc'),
    },
    {
      icon: ShieldCheck,
      title: t('verification.title'),
      description: t('verification.subtitle'),
      action: () => navigate('/verify')
    }
  ];

  const howItWorks = [
    {
      step: '01',
      icon: BookOpen,
      title: t('how_it_works.step1.title'),
      description: t('how_it_works.step1.desc')
    },
    {
      step: '02',
      icon: Calendar,
      title: t('how_it_works.step2.title'),
      description: t('how_it_works.step2.desc')
    },
    {
      step: '03',
      icon: MessageSquare,
      title: t('how_it_works.step3.title'),
      description: t('how_it_works.step3.desc')
    },
    {
      step: '04',
      icon: Award,
      title: t('how_it_works.step4.title'),
      description: t('how_it_works.step4.desc')
    }
  ];

  const footerLinks = [
    { label: t('footer.links.home'), href: '/' },
    { label: t('footer.links.features'), href: '#features' },
    { label: t('footer.links.about'), href: '#about' },
  ];

  const footerResources = [
    { icon: HelpCircle, label: t('footer.resources.help') },
    { icon: FileText, label: t('footer.resources.training') },
    { icon: FileText, label: t('footer.resources.guidelines') },
    { icon: Headphones, label: t('footer.resources.support') }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Public Navigation */}
      <PublicNavbar />

      {/* Hero Section - Simplified */}
      <section
        className="relative min-h-[90vh] bg-cover bg-center flex items-center"
        style={{ backgroundImage: 'url(/hero-banner.png)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-hotel-navy/95 via-hotel-navy/80 to-hotel-navy/40" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 w-full pt-20">
          <div className={`max-w-3xl ${isRTL ? 'text-right' : 'text-left'}`}>
            <span className="inline-block px-4 py-1.5 mb-6 border border-hotel-gold/40 rounded-full bg-hotel-navy/60 text-hotel-gold text-sm font-semibold tracking-wider uppercase">
              {t('hero.badge')}
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-4 text-white leading-tight font-serif">
              {t('welcome_title')}
            </h1>

            <div className="mb-6">
              <span className="text-4xl sm:text-5xl lg:text-7xl font-bold text-hotel-gold font-serif">
                {t('prime_connect')}
              </span>
              <div className="mt-2 text-white/70 text-lg">
                {t('brand_tagline')}
              </div>
            </div>

            <p className="text-lg sm:text-xl text-gray-200 mb-8 font-light leading-relaxed max-w-2xl">
              {t('subtitle')}
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                className="bg-hotel-gold hover:bg-white hover:text-hotel-navy text-hotel-navy font-bold px-8 rounded-full transition-all"
                onClick={() => navigate('/login')}
              >
                {t('login_button')}
                <ArrowRight className={`w-4 h-4 ${isRTL ? 'me-2 rotate-180' : 'ms-2'}`} />
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white/30 text-white hover:bg-white/10 rounded-full"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {t('explore_button')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className={isRTL ? 'lg:order-2' : ''}>
              <span className="text-hotel-gold font-bold tracking-wider uppercase text-sm mb-3 block">
                {t('who_we_are.subtitle')}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-hotel-navy mb-6 font-serif">
                {t('who_we_are.title')}
              </h2>
              <div className="w-20 h-1 bg-hotel-gold mb-6 rounded-full" />
              <p className="text-lg text-gray-600 leading-relaxed mb-4">
                {t('who_we_are.mission')}
              </p>
              <p className="text-gray-500 leading-relaxed mb-6">
                {t('who_we_are.description')}
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-hotel-gold flex-shrink-0" />
                    <span className="text-gray-700">{t(`who_we_are.features.${num}`)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`relative ${isRTL ? 'lg:order-1' : ''}`}>
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <img
                  src={aboutTeamImg}
                  alt={t('who_we_are.title')}
                  loading="lazy"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute bottom-0 start-0 end-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                  <div className="flex items-center gap-3">
                    <Award className="w-8 h-8 text-hotel-gold" />
                    <div>
                      <div className="font-bold text-white">{t('who_we_are.excellence_title')}</div>
                      <div className="text-sm text-white/80">{t('who_we_are.excellence_desc')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <span className="text-hotel-gold font-bold tracking-wider uppercase text-sm mb-3 block">
              {t('features.subtitle')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-hotel-navy mb-4 font-serif">
              {t('features.title')}
            </h2>
            <p className="text-gray-500">
              {t('features.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Wrapper: ElementType = feature.action ? 'button' : 'div'
              return (
                <Wrapper
                  key={feature.title}
                  onClick={feature.action}
                  {...(feature.action ? { type: 'button' } : {})}
                  className={`text-start bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-100 ${feature.action ? 'cursor-pointer hover:border-hotel-gold' : ''}`}
                >
                  <div className="w-12 h-12 bg-hotel-gold/10 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-hotel-gold" />
                  </div>
                  <h3 className="text-lg font-bold text-hotel-navy mb-2 flex items-center justify-between">
                    {feature.title}
                    {feature.action && <ArrowRight className={`w-4 h-4 text-hotel-gold ${isRTL ? 'rotate-180' : ''}`} />}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </Wrapper>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <span className="text-hotel-gold font-bold tracking-wider uppercase text-sm mb-3 block">
              {t('how_it_works.subtitle')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-hotel-navy mb-4 font-serif">
              {t('how_it_works.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step) => (
              <div key={step.step} className="text-center">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-hotel-gold/10 rounded-full flex items-center justify-center">
                    <step.icon className="w-7 h-7 text-hotel-gold" />
                  </div>
                  <div className="absolute -top-1 -end-1 w-6 h-6 bg-hotel-navy rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-hotel-navy mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-hotel-navy">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 font-serif">
            {t('cta.title')}
          </h2>
          <p className="text-lg text-white/70 mb-8">
            {t('cta.description')}
          </p>
          <Button
            size="lg"
            className="bg-hotel-gold hover:bg-white hover:text-hotel-navy text-hotel-navy font-bold px-10 rounded-full"
            onClick={() => navigate('/login')}
          >
            {t('cta.button_primary')}
            <ArrowRight className={`w-4 h-4 ${isRTL ? 'me-2 rotate-180' : 'ms-2'}`} />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-hotel-navy border-t border-white/10 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <img src="/prime-logo-light.png" alt="Prime Hotels" className="h-10 w-auto mb-4" />
              <p className="text-white/60 text-sm leading-relaxed">
                {t('footer.description')}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold mb-4">{t('footer.links.title')}</h4>
              <ul className="space-y-2">
                {footerLinks.map((link) => (
                  <li key={link.href}>
                    <button
                      onClick={() => {
                        if (link.href.startsWith('#')) {
                          document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
                        } else {
                          navigate(link.href);
                        }
                      }}
                      className="text-white/60 hover:text-hotel-gold transition-colors text-sm"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-bold mb-4">{t('footer.resources.title')}</h4>
              <ul className="space-y-2">
                {footerResources.map((resource) => (
                  <li key={resource.label} className="flex items-center gap-2 text-white/60 text-sm">
                    <resource.icon className="w-4 h-4 text-hotel-gold" />
                    <span>{resource.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-bold mb-4">{t('footer.contact.title')}</h4>
              <ul className="space-y-3 text-white/60 text-sm">
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-hotel-gold flex-shrink-0 mt-0.5" />
                  <span>{t('footer.contact.location')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-hotel-gold flex-shrink-0" />
                  <span>{t('footer.contact.email_label')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-hotel-gold flex-shrink-0" />
                  <span>{t('footer.contact.phone_label')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-white/40 text-xs">
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </p>
            <div className="flex gap-4 text-xs">
              <button className="text-white/40 hover:text-white transition-colors">
                {t('footer.legal.privacy')}
              </button>
              <button className="text-white/40 hover:text-white transition-colors">
                {t('footer.legal.terms')}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
