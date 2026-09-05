import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { useAuth } from '@/hooks/useAuth';
import { getAuthFlowRedirectPath } from '@/lib/authFlowState';
import {
  AUTH_ROUTE_RECOVERY_MESSAGE,
  buildCanonicalUrl,
  clearAltusServiceWorkersAndCaches,
  normalizePathname,
  shouldProtectAuthEntry,
} from '@/lib/runtimeRecovery';
import { AlertCircle, Linkedin, Lock, MapPin, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { lazy, Suspense, useEffect, useState, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BriefingDialog } from './publicComponents';
import { canela, neueHaas, inter, COLOR, cairo } from './publicConstants';

const InviteRouteRescue = lazy(() => import('@/pages/auth/CompleteInvite'));
const ResetRouteRescue = lazy(() => import('@/pages/auth/ResetPassword'));

/* ── Briefing dialog context so any child page can open it ── */
const BriefingContext = createContext<{ openBriefing: () => void }>({ openBriefing: () => {} });
export const useBriefing = () => useContext(BriefingContext);

export default function PublicLayout() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

  useEffect(() => {
    const handleLangChange = (lng: string) => setCurrentLang(lng);
    i18n.on('languageChanged', handleLangChange);
    return () => i18n.off('languageChanged', handleLangChange);
  }, [i18n]);

  const isRTL = currentLang === 'ar' || currentLang.startsWith('ar') || i18n.dir() === 'rtl';
  const currentPathname = normalizePathname(window.location.pathname);
  const pendingAuthFlowPath = getAuthFlowRedirectPath();
  const isInvitePath = currentPathname === '/complete-invite' || currentPathname.startsWith('/complete-invite/');
  const isResetPath = currentPathname === '/reset-password' || currentPathname.startsWith('/reset-password/');
  const secureEntryRecoveryNeeded = shouldProtectAuthEntry(
    window.location.pathname,
    window.location.search,
    window.location.hash
  );
  const [secureEntryRecoveryFailed, setSecureEntryRecoveryFailed] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);

  useEffect(() => {
    if (secureEntryRecoveryNeeded) {
      let cancelled = false;
      const recoveryKey = '__public_home_auth_entry_recovery__';

      const runRecovery = async () => {
        try {
          const alreadyAttempted = (() => {
            try {
              return sessionStorage.getItem(recoveryKey) === '1';
            } catch {
              return false;
            }
          })();
          if (alreadyAttempted) {
            if (!cancelled) {
              setSecureEntryRecoveryFailed(true);
            }
            return;
          }

          try {
            sessionStorage.setItem(recoveryKey, '1');
          } catch {
            // Ignore
          }

          const clearedArtifacts = await clearAltusServiceWorkersAndCaches();
          if (!cancelled && clearedArtifacts) {
            window.location.replace(
              buildCanonicalUrl(window.location.pathname, window.location.search, window.location.hash)
            );
            return;
          }
        } catch {
          // Fall through
        }

        if (!cancelled) {
          setSecureEntryRecoveryFailed(true);
        }
      };

      void runRecovery();

      return () => {
        cancelled = true;
      };
    }

    if (authUser) {
      if (pendingAuthFlowPath) {
        navigate(pendingAuthFlowPath, { replace: true });
        return;
      }
      navigate('/dashboard', { replace: true });
    }
  }, [authUser, navigate, pendingAuthFlowPath, secureEntryRecoveryNeeded]);

  /* ── Auth rescue screens ── */
  if (secureEntryRecoveryNeeded) {
    if (secureEntryRecoveryFailed && (isInvitePath || isResetPath)) {
      const RescueComponent = isInvitePath ? InviteRouteRescue : ResetRouteRescue;
      return (
        <Suspense
          fallback={
            <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-500" />
                <p className="mt-3 text-sm text-slate-600">{AUTH_ROUTE_RECOVERY_MESSAGE}</p>
              </div>
            </div>
          }
        >
          <RescueComponent />
        </Suspense>
      );
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
                ? `Altus Advisory detected an unexpected public-page render on ${currentPathname}. Retry the secure link to continue account setup.`
                : AUTH_ROUTE_RECOVERY_MESSAGE}
            </p>
          </div>
          <div className="mt-6 grid gap-3">
            <Button
              className="w-full"
              onClick={async () => {
                await clearAltusServiceWorkersAndCaches();
                window.location.replace(
                  buildCanonicalUrl(window.location.pathname, window.location.search, window.location.hash)
                );
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
    );
  }

  if (authUser) {
    return null;
  }

  return (
    <BriefingContext.Provider value={{ openBriefing: () => setBriefingOpen(true) }}>
      <div className="min-h-screen flex flex-col selection:bg-amber-500/30 selection:text-amber-200" dir={isRTL ? 'rtl' : 'ltr'}>
        <BriefingDialog open={briefingOpen} onOpenChange={setBriefingOpen} />
        <PublicNavbar />

        <Outlet />

        {/* ═══════════════ FOOTER ═══════════════ */}
        <footer
          className="py-16 sm:py-20 border-t relative overflow-hidden"
          style={{ backgroundColor: COLOR.charcoalDeep, borderColor: 'rgba(255,255,255,0.08)' }}
        >
          {/* Subtle ambient copper glow in footer background */}
          <div
            className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#C45B2F]/10 via-transparent to-transparent pointer-events-none"
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* VIP Partner Briefing Banner */}
            <div className="mb-16 p-8 sm:p-10 rounded-2xl border border-[#C45B2F]/30 bg-gradient-to-r from-[#171B22] via-[#1A1F28] to-[#141820] shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-start space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C45B2F]/15 border border-[#C45B2F]/30 text-[#E07A5F] text-[11px] font-bold uppercase tracking-wider" style={isRTL ? cairo : neueHaas}>
                  <Sparkles className="w-3.5 h-3.5" />
                  {isRTL ? 'استشارات تنفيذية نخبوبة للملاك والمستثمرين' : 'EXECUTIVE ADVISORY FOR OWNERS & INVESTORS'}
                </div>
                <h3 className="text-2xl sm:text-3xl text-white font-normal leading-snug" style={isRTL ? cairo : canela}>
                  {isRTL ? 'جاهز للارتقاء بأداء أصولك الفندقية ومحفظتك الاستثمارية؟' : 'Ready to elevate your hotel asset or portfolio returns?'}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed" style={isRTL ? cairo : inter}>
                  {isRTL
                    ? 'تواصل مباشرة مع الشركاء التنفيذيين لمناقشة التحديات التشغيلية، دراسات الجدوى، أو تعظيم مؤشرات RevPAR وGOPPAR بسرية تامة.'
                    : 'Connect directly with managing principals to discuss asset turnarounds, feasibility validation, or RevPAR enhancement under strict fiduciary confidence.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
                <Button
                  onClick={() => setBriefingOpen(true)}
                  className="w-full sm:w-auto h-12 px-7 bg-[#C45B2F] hover:bg-[#D96B3D] text-white text-xs font-bold tracking-[0.15em] uppercase rounded-xl shadow-lg shadow-[#C45B2F]/25 hover:shadow-xl hover:shadow-[#C45B2F]/40 transition-all"
                  style={isRTL ? cairo : neueHaas}
                >
                  <Sparkles className="w-4 h-4 me-2" />
                  {isRTL ? 'طلب إحاطة شريك' : 'REQUEST BRIEFING'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto h-12 px-6 border-white/20 bg-white/[0.03] hover:bg-white/10 text-white text-xs font-semibold tracking-wider uppercase rounded-xl transition-all"
                  style={isRTL ? cairo : neueHaas}
                >
                  <Lock className="w-4 h-4 me-2 text-slate-400" />
                  {isRTL ? 'الدخول المؤسسي' : 'ENTERPRISE PORTAL'}
                </Button>
              </div>
            </div>

            {/* Brand Crest & Tagline */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-12 border-b border-white/[0.08]">
              <div className="flex items-center gap-3.5">
                <img src="/altus-emblem-icon.png" alt="ALTUS Advisory" className="h-11 w-auto object-contain" />
                <div className="text-start">
                  <span className="block text-2xl text-white font-normal" style={isRTL ? cairo : canela}>
                    {isRTL ? 'ألتوس' : 'ALTUS'}
                  </span>
                  <span
                    className="block text-[10px] tracking-[0.3em] font-bold text-[#E07A5F] uppercase mt-0.5"
                    style={isRTL ? cairo : neueHaas}
                  >
                    {isRTL ? 'استشارات الضيافة والأعمال' : 'ADVISORY'}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-400 max-w-xl text-center md:text-start" style={isRTL ? cairo : inter}>
                {isRTL
                  ? 'منظومة استشارية نخبوية تعمل عند تقاطع عمليات الضيافة الفاخرة وذكاء الأعمال المتقدم — مصممة للعقد القادم في المملكة العربية السعودية.'
                  : 'A boutique strategy house operating at the intersection of elite hospitality operations and advanced business intelligence — engineered for the Kingdom’s next decade.'}
              </p>
            </div>

            {/* 5 Rich Footer Navigation Columns */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 py-12 border-b border-white/[0.08] text-start">
              {/* Column 1: Firm */}
              <div>
                <h5 className="font-bold text-white uppercase tracking-wider mb-4 text-xs" style={isRTL ? cairo : neueHaas}>
                  {isRTL ? 'المنظومة' : 'THE FIRM'}
                </h5>
                <ul className="space-y-2.5 text-slate-400 text-xs" style={isRTL ? cairo : inter}>
                  <li>
                    <Link to="/about" className="hover:text-[#E07A5F] transition-colors block py-0.5">
                      {isRTL ? 'عن ألتوس' : 'About Altus'}
                    </Link>
                  </li>
                  <li>
                    <Link to="/leadership" className="hover:text-[#E07A5F] transition-colors block py-0.5">
                      {isRTL ? 'القيادة التنفيذية' : 'Executive Leadership'}
                    </Link>
                  </li>
                  <li>
                    <Link to="/vision-2030" className="hover:text-[#E07A5F] transition-colors block py-0.5">
                      {isRTL ? 'رؤية السعودية 2030' : 'Saudi Vision 2030'}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 2: Capabilities & AI */}
              <div>
                <h5 className="font-bold text-white uppercase tracking-wider mb-4 text-xs" style={isRTL ? cairo : neueHaas}>
                  {isRTL ? 'القدرات والذكاء' : 'CAPABILITIES & AI'}
                </h5>
                <ul className="space-y-2.5 text-slate-400 text-xs" style={isRTL ? cairo : inter}>
                  <li>
                    <Link to="/about#practices" className="hover:text-[#E07A5F] transition-colors block py-0.5">
                      {isRTL ? 'حلول الضيافة والأصول' : 'Hospitality Solutions'}
                    </Link>
                  </li>
                  <li>
                    <Link to="/digital" className="hover:text-[#E07A5F] transition-colors block py-0.5">
                      {isRTL ? 'الرقمنة والذكاء الاصطناعي' : 'Digital & Applied AI'}
                    </Link>
                  </li>
                  <li>
                    <Link to="/methodology" className="hover:text-[#E07A5F] transition-colors block py-0.5">
                      {isRTL ? 'منهجية ألتوس أسنت™' : 'Altus Ascent™'}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 3: Impact & Proof */}
              <div>
                <h5 className="font-bold text-white uppercase tracking-wider mb-4 text-xs" style={isRTL ? cairo : neueHaas}>
                  {isRTL ? 'السجل والأثر' : 'TRACK RECORD'}
                </h5>
                <ul className="space-y-2.5 text-slate-400 text-xs" style={isRTL ? cairo : inter}>
                  <li>
                    <Link to="/case-studies" className="hover:text-[#E07A5F] transition-colors block py-0.5">
                      {isRTL ? 'دراسات الحالة' : 'Case Studies'}
                    </Link>
                  </li>
                  <li>
                    <Link to="/case-studies" className="hover:text-[#E07A5F] transition-colors block py-0.5">
                      {isRTL ? 'تحول الأصول وRevPAR' : 'Turnaround Outcomes'}
                    </Link>
                  </li>
                  <li>
                    <Link to="/verify" className="hover:text-[#E07A5F] transition-colors block py-0.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#E07A5F]" />
                      <span>{isRTL ? 'التحقق من الشهادات' : 'Verify Credentials'}</span>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 4: Enterprise Portal */}
              <div>
                <h5 className="font-bold text-white uppercase tracking-wider mb-4 text-xs" style={isRTL ? cairo : neueHaas}>
                  {isRTL ? 'البوابة المؤسسية' : 'PORTAL'}
                </h5>
                <ul className="space-y-2.5 text-slate-400 text-xs" style={isRTL ? cairo : inter}>
                  <li>
                    <Link to="/login" className="hover:text-[#E07A5F] transition-colors flex items-center gap-1.5 py-0.5">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>{isRTL ? 'دخول منسوبي المنشآت' : 'Enterprise Access'}</span>
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={() => setBriefingOpen(true)}
                      className="hover:text-[#E07A5F] transition-colors text-start block py-0.5"
                    >
                      {isRTL ? 'طلب استشارة سرية' : 'Confidential Inquiries'}
                    </button>
                  </li>
                </ul>
              </div>

              {/* Column 5: Kingdom of Saudi Arabia Operations */}
              <div>
                <h5 className="font-bold text-white uppercase tracking-wider mb-4 text-xs" style={isRTL ? cairo : neueHaas}>
                  {isRTL ? 'المملكة العربية السعودية' : 'KINGDOM OF SAUDI ARABIA'}
                </h5>
                <div className="space-y-2 text-slate-400 text-xs leading-relaxed" style={isRTL ? cairo : inter}>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#E07A5F] shrink-0 mt-0.5" />
                    <span>{isRTL ? 'الرياض • جدة • عمليات المملكة' : 'Riyadh • Jeddah • KSA Operations'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isRTL
                      ? 'مواءمة استراتيجية كاملة مع مستهدفات السياحة الوطنية والـ ١٥٠ مليون زيارة سنوية.'
                      : 'Fully aligned with Vision 2030 national tourism targets and luxury asset transformation.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Bar: Copyright, Legal, Social */}
            <div
              className="pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-4"
              style={isRTL ? cairo : inter}
            >
              <p>© {new Date().getFullYear()} ALTUS ADVISORY FIRM. ALL RIGHTS RESERVED.</p>
              <div className="flex items-center gap-6">
                <span className="hover:text-slate-200 cursor-pointer">{isRTL ? 'سياسة الخصوصية' : 'PRIVACY'}</span>
                <span className="hover:text-slate-200 cursor-pointer">{isRTL ? 'شروط الاستخدام' : 'TERMS'}</span>
                <a
                  href="https://www.linkedin.com/company/altus-advisory-firm"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Altus Advisory on LinkedIn"
                  className="text-slate-400 hover:text-[#E07A5F] transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </BriefingContext.Provider>
  );
}
