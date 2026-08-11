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
import { AlertCircle, Linkedin, Lock, RefreshCw } from 'lucide-react';
import { lazy, Suspense, useEffect, useState, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BriefingDialog } from './publicComponents';
import { canela, neueHaas, inter, COLOR } from './publicConstants';

const InviteRouteRescue = lazy(() => import('@/pages/auth/CompleteInvite'));
const ResetRouteRescue = lazy(() => import('@/pages/auth/ResetPassword'));

/* ── Briefing dialog context so any child page can open it ── */
const BriefingContext = createContext<{ openBriefing: () => void }>({ openBriefing: () => {} });
export const useBriefing = () => useContext(BriefingContext);

export default function PublicLayout() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
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
      navigate('/home', { replace: true });
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
        <footer className="py-16 border-t" style={{ backgroundColor: COLOR.charcoalDeep, borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="max-w-6xl mx-auto px-4">
            {/* Top: Logo + Tagline */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2.5 mb-4">
                <img src="/altus-emblem-icon.png" alt="" className="h-10 w-auto object-contain" />
                <span className="text-white leading-none text-start" style={canela}>
                  <span className="block text-xl tracking-wide">ALTUS</span>
                  <span className="block text-[10px] tracking-[0.3em] font-bold mt-0.5" style={{ ...neueHaas, color: COLOR.copper }}>ADVISORY</span>
                </span>
              </div>
              <p className="text-xs uppercase tracking-[0.2em] font-bold mb-3" style={{ ...neueHaas, color: COLOR.copper }}>
                ELEVATING HOSPITALITY &amp; BUSINESS PERFORMANCE
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto" style={inter}>
                {isRTL
                  ? 'منظومة استشارية نخبوية تعمل عند تقاطع عمليات الضيافة الفاخرة وذكاء الأعمال المتقدم — مصممة للعقد القادم في المملكة.'
                  : 'A boutique strategy house operating at the intersection of elite hospitality operations and advanced business intelligence — built for the Kingdom\u2019s next decade.'}
              </p>
            </div>

            {/* Link Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12 pt-8 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div>
                <h5 className="font-bold text-white uppercase tracking-wider mb-3 text-xs" style={neueHaas}>
                  {isRTL ? 'الشركة' : 'FIRM'}
                </h5>
                <ul className="space-y-2 text-slate-400 text-xs" style={inter}>
                  <li><a href="/about" className="hover:text-amber-500 transition-colors">{isRTL ? 'من نحن' : 'About'}</a></li>
                  <li><a href="/about" className="hover:text-amber-500 transition-colors">{isRTL ? 'لماذا ألتوس' : 'Why Altus'}</a></li>
                  <li><a href="/leadership" className="hover:text-amber-500 transition-colors">{isRTL ? 'القيادة' : 'Leadership'}</a></li>
                </ul>
              </div>
              <div>
                <h5 className="font-bold text-white uppercase tracking-wider mb-3 text-xs" style={neueHaas}>
                  {isRTL ? 'الخدمات' : 'SERVICES'}
                </h5>
                <ul className="space-y-2 text-slate-400 text-xs" style={inter}>
                  <li><a href="/about" className="hover:text-amber-500 transition-colors">{isRTL ? 'حلول الضيافة' : 'Hospitality Solutions'}</a></li>
                  <li><a href="/about" className="hover:text-amber-500 transition-colors">{isRTL ? 'نمو الأعمال' : 'Business Growth'}</a></li>
                  <li><a href="/about" className="hover:text-amber-500 transition-colors">{isRTL ? 'منصة HK&P' : 'HK&P Platform'}</a></li>
                </ul>
              </div>
              <div>
                <h5 className="font-bold text-white uppercase tracking-wider mb-3 text-xs" style={neueHaas}>
                  {isRTL ? 'المنهجية' : 'METHODOLOGY'}
                </h5>
                <ul className="space-y-2 text-slate-400 text-xs" style={inter}>
                  <li><a href="/methodology" className="hover:text-amber-500 transition-colors">{isRTL ? 'ألتوس أسنت™' : 'Altus Ascent™'}</a></li>
                  <li><a href="/vision-2030" className="hover:text-amber-500 transition-colors">{isRTL ? 'رؤية 2030' : 'Saudi Vision 2030'}</a></li>
                </ul>
              </div>
              <div>
                <h5 className="font-bold text-white uppercase tracking-wider mb-3 text-xs" style={neueHaas}>
                  {isRTL ? 'الموارد' : 'RESOURCES'}
                </h5>
                <ul className="space-y-2 text-slate-400 text-xs" style={inter}>
                  <li><button onClick={() => navigate('/verify')} className="hover:text-amber-500 transition-colors">{isRTL ? 'التحقق من الشهادات' : 'Verify Credentials'}</button></li>
                  <li><button onClick={() => setBriefingOpen(true)} className="hover:text-amber-500 transition-colors">{isRTL ? 'تواصل معنا' : 'Contact'}</button></li>
                </ul>
              </div>
              <div>
                <h5 className="font-bold text-white uppercase tracking-wider mb-3 text-xs" style={neueHaas}>
                  {isRTL ? 'البوابة' : 'PORTAL'}
                </h5>
                <ul className="space-y-2 text-slate-400 text-xs" style={inter}>
                  <li><button onClick={() => navigate('/login')} className="hover:text-amber-500 transition-colors flex items-center gap-1"><Lock className="w-3 h-3" />{isRTL ? 'الدخول المؤسسي' : 'Enterprise Access'}</button></li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400" style={{ ...inter, borderColor: 'rgba(255,255,255,0.08)' }}>
              <p>© {new Date().getFullYear()} ALTUS ADVISORY. ALL RIGHTS RESERVED.</p>
              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                <span className="hover:text-slate-200 cursor-pointer">{isRTL ? 'الخصوصية' : 'PRIVACY'}</span>
                <span className="hover:text-slate-200 cursor-pointer">{isRTL ? 'الشروط' : 'TERMS'}</span>
                <a
                  href="https://www.linkedin.com/company/altus-advisory-firm"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Altus Advisory on LinkedIn"
                  className="text-slate-400 hover:text-amber-400 transition-colors"
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
