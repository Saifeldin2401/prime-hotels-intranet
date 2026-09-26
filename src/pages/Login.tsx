import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthMotionVisual } from '@/components/auth/motion/AuthMotionVisual';
import { useTenant } from '@/contexts/TenantContext';
import { cn } from '@/lib/utils';
import { Building2, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { t, i18n } = useTranslation('auth');
  const [_searchParams] = useSearchParams();
  const { currentOrganization } = useTenant();
  const year = new Date().getFullYear();
  const isRTL = i18n.dir() === 'rtl';

  // Dynamic greeting based on KSA time
  const { greeting, icon } = useMemo(() => {
    const ksaHour = parseInt(
      new Date().toLocaleString('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: 'Asia/Riyadh',
      }),
      10
    );

    if (ksaHour >= 5 && ksaHour < 12) {
      return { greeting: t('greeting_morning', { defaultValue: 'Good morning' }), icon: '☀️' };
    } else if (ksaHour >= 12 && ksaHour < 17) {
      return { greeting: t('greeting_afternoon', { defaultValue: 'Good afternoon' }), icon: '🌤️' };
    } else if (ksaHour >= 17 && ksaHour < 21) {
      return { greeting: t('greeting_evening', { defaultValue: 'Good evening' }), icon: '🌅' };
    } else {
      return { greeting: t('greeting_night', { defaultValue: 'Good night' }), icon: '🌙' };
    }
  }, [t]);

  // Tenant resolution: check active organization or URL context
  const tenantOrg = currentOrganization;
  const tenantName = isRTL ? tenantOrg?.name_ar || tenantOrg?.name : tenantOrg?.name;
  const tenantLogo = tenantOrg?.logo_url;

  // Sync favicon if tenant specifies custom branding
  useEffect(() => {
    if (tenantOrg?.favicon_url) {
      const existingFavicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (existingFavicon) {
        existingFavicon.href = tenantOrg.favicon_url;
      }
    }
  }, [tenantOrg?.favicon_url]);

  useEffect(() => {
    if (tenantOrg?.brand_colors?.primary) {
      document.documentElement.style.setProperty('--tenant-accent', tenantOrg.brand_colors.primary);
      return () => {
        document.documentElement.style.removeProperty('--tenant-accent');
      };
    }
  }, [tenantOrg?.brand_colors?.primary]);

  const handleLanguageToggle = (lang: string) => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang).catch((err) => {
        console.error('Failed to change language:', err);
      });
    }
  };

  return (
    <div
      className="h-screen max-h-screen w-full overflow-hidden grid grid-cols-1 lg:grid-cols-2 bg-white font-sans text-ds-ink selection:bg-ds-brass/20 selection:text-ds-ink antialiased"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* â”€â”€ LEFT PANEL: LIVING EDITORIAL HOSPITALITY VISUAL (50% DESKTOP SPLIT) â”€â”€ */}
      <div className="hidden lg:flex flex-col h-full max-h-screen min-w-0 overflow-hidden border-e border-ds-border">
        <AuthMotionVisual
          visualType="auto"
          webmSrc="/media/auth/altus-auth-motion.webm"
          mp4Src="/media/auth/altus-auth-motion.mp4"
          posterSrc="/media/auth/altus-auth-motion-poster.webp"
          posterFallbackSrc="/media/auth/altus-auth-motion-poster.jpg"
          headline={t('auth_headline', {
            defaultValue: 'Learning that elevates hospitality excellence.',
          })}
          subline={t('auth_subline', {
            defaultValue:
              'Training, knowledge, assessment and certification for world-class hospitality teams.',
          })}
          badgeText={t('badge_text', {
            defaultValue: 'Hospitality Learning & Certification',
          })}
          showOverlayPillars={true}
          isRTL={isRTL}
          className="h-full"
        />
      </div>

      {/* â”€â”€ RIGHT PANEL: REFINED ENTERPRISE AUTHENTICATION EXPERIENCE â”€â”€ */}
      <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10 xl:p-12 h-full max-h-screen min-w-0 overflow-hidden bg-white">
        {/* Top Bar: Brand Context (Tenant or Mobile only) + Language Switcher */}
        <header className="flex items-center justify-between w-full shrink-0">
          <div>
            {tenantOrg ? (
              <div className="flex items-center gap-3">
                {tenantLogo ? (
                  <img
                    src={tenantLogo}
                    alt={tenantName || 'Tenant'}
                    className="h-8 max-w-[120px] object-contain"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-ds-surface-subtle border border-ds-border flex items-center justify-center text-ds-brass">
                    <Building2 className="w-4 h-4" />
                  </div>
                )}
                <div className="leading-tight">
                  <span className="block text-sm font-semibold tracking-tight text-ds-ink">
                    {tenantName}
                  </span>
                  <span className="block text-[10px] font-medium tracking-wider uppercase text-ds-muted">
                    Altus Connect
                  </span>
                </div>
              </div>
            ) : (
              /* Mobile fallback: only show logo on mobile when left panel is hidden */
              <div className="flex lg:hidden items-center gap-2.5">
                <img
                  src="/altus-emblem-icon.png"
                  alt="Altus Connect"
                  className="h-8 w-8 object-contain rounded-md"
                />
                <div className="leading-tight">
                  <span className="block text-sm font-semibold tracking-tight text-ds-ink">
                    Altus Connect
                  </span>
                  <span className="block text-[9px] font-medium tracking-widest uppercase text-ds-brass">
                    Enterprise
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Restrained Language Switcher (English | العربية) */}
          <nav
            className="flex items-center gap-1.5 text-xs font-medium text-ds-muted select-none ms-auto shrink-0"
            aria-label={t('change_language', { defaultValue: 'Change Language' })}
          >
            <button
              type="button"
              onClick={() => handleLanguageToggle('en')}
              className={cn(
                'px-2 py-1 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-brass cursor-pointer',
                i18n.language.startsWith('en')
                  ? 'text-ds-ink font-semibold'
                  : 'text-ds-muted hover:text-ds-ink'
              )}
              aria-pressed={i18n.language.startsWith('en')}
            >
              English
            </button>
            <span className="text-ds-border-strong select-none" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              onClick={() => handleLanguageToggle('ar')}
              className={cn(
                'px-2 py-1 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-brass cursor-pointer font-sans',
                i18n.language.startsWith('ar')
                  ? 'text-ds-ink font-semibold'
                  : 'text-ds-muted hover:text-ds-ink'
              )}
              aria-pressed={i18n.language.startsWith('ar')}
            >
              العربية
            </button>
          </nav>
        </header>

        {/* Mobile-only compact brand visual */}
        <div className="flex lg:hidden items-center justify-center py-2 shrink-0">
          <div className="w-20 h-20 opacity-80">
            <img src="/altus-emblem-icon.png" alt="" className="w-full h-full object-contain" aria-hidden="true" />
          </div>
        </div>

        {/* Center: Authentication Surface (Immediate interaction, no blocking) */}
        <main className="w-full max-w-sm mx-auto my-auto py-2 sm:py-4 flex-1 min-h-0 flex flex-col justify-center">
          {/* Confident Heading & Concise Enterprise Copy */}
          <div className="mb-4 sm:mb-5 text-start space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ds-ink flex items-center gap-2">
              <span aria-hidden="true">{icon}</span>
              <span>{greeting}</span>
            </h1>
            <p className="text-xs sm:text-sm text-ds-muted leading-relaxed">
              {t('sign_in_subtitle', { defaultValue: 'Sign in to continue to Altus Connect.' })}
            </p>
            <p className="text-[11px] text-ds-muted/80 flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-3 h-3 text-ds-brass shrink-0" />
              {t('social_proof', { defaultValue: 'Trusted by hospitality teams across the Kingdom' })}
            </p>
          </div>

          {/* Core Authentication Form */}
          <LoginForm />
        </main>

        {/* Bottom Footer (Single Canonical Footer for the experience) */}
        <footer className="w-full pt-4 border-t border-ds-border/60 flex items-center justify-between gap-3 text-xs text-ds-muted shrink-0">
          <span className="truncate">{t('copyright', { year, defaultValue: `Â© ${year} Altus Connect. All rights reserved.` })}</span>
          <span className="text-[11px] text-ds-muted/80 shrink-0">
            {tenantOrg ? t('verified_tenant', { defaultValue: 'Verified Tenant Environment' }) : t('learning_cloud', { defaultValue: 'Hospitality Learning Cloud' })}
          </span>
        </footer>
      </div>
    </div>
  );
}