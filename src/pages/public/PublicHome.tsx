import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { RevealUp } from '@/components/public/RevealUp';
import { FloatingConciergeBadge } from '@/components/public/FloatingConciergeBadge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { getAuthFlowRedirectPath } from '@/lib/authFlowState';
import {
  AUTH_ROUTE_RECOVERY_MESSAGE,
  buildCanonicalUrl,
  clearAltusServiceWorkersAndCaches,
  normalizePathname,
  shouldProtectAuthEntry,
} from '@/lib/runtimeRecovery';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Linkedin,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const InviteRouteRescue = lazy(() => import('@/pages/auth/CompleteInvite'));
const ResetRouteRescue = lazy(() => import('@/pages/auth/ResetPassword'));

/* ──────────────────────────── STYLE CONSTANTS ──────────────────────────── */
// 01 PRIMARY DISPLAY: Canela (Hero headlines, quotes, editorial highlights)
const canela = { fontFamily: "'Canela', 'Playfair Display', Georgia, 'Times New Roman', serif" };

// 02 EXECUTIVE SANS SERIF: Neue Haas Grotesk (Headings H1-H4, navigation, subtitles, labels)
const neueHaas = { fontFamily: "'Neue Haas Grotesk', 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" };

// 03 READING TYPEFACE: Inter (Body copy, paragraphs, long-form content)
const inter = { fontFamily: "'Inter', system-ui, sans-serif" };

// 04 TECHNICAL TYPEFACE: IBM Plex Mono (Data, metrics, KPIs, financial info)
const mono = { fontFamily: "'IBM Plex Mono', Consolas, monospace" };

// Legacy alias for compatibility
const playfair = canela;

// ALTUS ADVISORY BRAND COLOR SYSTEM
const COLOR = {
  creamyWhite: '#F7F5F1', // Primary light background, open space (60%)
  ivory: '#FAF7F2',       // Cards, elevated containers, subtle backgrounds (20%)
  copper: '#C45B2F',      // Signature Transformation Copper (10%) - CTAs, highlights, key metrics
  sand: '#D9C6A3',        // Warm Sand (5%) - Soft backgrounds, infographics, dividers
  slate: '#5B6775',       // Slate Gray (3%) - Body copy, supporting copy
  charcoal: '#1E2329',    // Executive Charcoal (1%) - Headings, strong text
  charcoalDeep: '#16191E',// Dark background surface
  emerald: '#2E7D5A',     // Success Emerald - Metrics, growth indicators
  // Mapped aliases for exact brand match
  navy: '#1E2329',
  navyDeep: '#16191E',
  cream: '#F7F5F1',
  gold: '#C45B2F',
  goldLight: '#C45B2F',
} as const;

/* ──────────────────────────── ANIMATION HELPERS ──────────────────────────── */
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

function FadeInSection({ children, className = '', delay = 0, y = 12, style }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, transform: `translateY(${y}px)` }}
      animate={isInView
        ? { opacity: 1, transform: 'translateY(0px)' }
        : prefersReducedMotion ? { opacity: 0 } : { opacity: 0, transform: `translateY(${y}px)` }
      }
      transition={{ duration: 0.5, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

function StaggerChildren({ children, className = '', staggerDelay = 0.05, style }: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: prefersReducedMotion ? 0 : staggerDelay } },
      }}
    >
      {children}
    </motion.div>
  );
}

const staggerItem = {
  hidden: { opacity: 0, transform: 'translateY(8px)' },
  visible: {
    opacity: 1,
    transform: 'translateY(0px)',
    transition: { duration: 0.4, ease: EASE_OUT },
  },
};

function CountUp({ target, suffix = '', duration = 1.5 }: { target: string; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (!isInView || prefersReducedMotion) return;
    const numericStr = target.replace(/[^0-9.]/g, '');
    const numericVal = parseFloat(numericStr);
    if (isNaN(numericVal)) return;
    const prefix = target.substring(0, target.indexOf(numericStr));
    const suffixPart = target.substring(target.indexOf(numericStr) + numericStr.length);
    const isDecimal = numericStr.includes('.');
    const startTime = performance.now();
    const durationMs = duration * 1000;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = eased * numericVal;
      const formatted = isDecimal ? current.toFixed(1) : Math.round(current).toString();
      setDisplay(`${prefix}${formatted}${suffixPart}`);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [isInView, prefersReducedMotion, target, duration]);

  return <span ref={ref}>{display}</span>;
}

/* ──────────────────────────── DECORATIVE SVG ──────────────────────────── */
function CopperDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <div className="h-px w-8 bg-[#C45B2F]/30" />
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#C45B2F]/70">
        <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z" fill="currentColor" />
      </svg>
      <div className="h-px w-8 bg-[#C45B2F]/30" />
    </div>
  );
}

const GoldDivider = CopperDivider;

/* ──────────────────────────── MAIN COMPONENT ──────────────────────────── */
export default function PublicHome() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['public', 'common']);
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
  const [isSubmittingBriefing, setIsSubmittingBriefing] = useState(false);

  const [briefingForm, setBriefingForm] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    mandateType: 'Hospitality Solutions',
    notes: '',
  });

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

  const handleBriefingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingBriefing) return;

    const name = briefingForm.name.trim();
    const email = briefingForm.email.trim();
    if (!name || !email) return;

    setIsSubmittingBriefing(true);
    try {
      const { error } = await supabase.from('partner_briefing_requests').insert({
        name,
        email,
        phone: briefingForm.phone.trim() || null,
        organization: briefingForm.organization.trim() || null,
        mandate_type: briefingForm.mandateType || null,
        message: briefingForm.notes.trim() || null,
      });

      if (error) throw error;

      toast.success(
        isRTL
          ? 'تم استلام طلب الإحاطة بنجاح. سيتواصل معك أحد الشركاء خلال يومي عمل.'
          : 'Briefing request received. A partner will respond directly within two business days.'
      );
      setBriefingOpen(false);
      setBriefingForm({ name: '', email: '', phone: '', organization: '', mandateType: 'Hospitality Solutions', notes: '' });
    } catch (err) {
      console.error('Failed to submit partner briefing request:', err);
      toast.error(
        isRTL
          ? 'تعذر إرسال الطلب. يرجى المحاولة مرة أخرى.'
          : 'We couldn’t submit your request. Please try again.'
      );
    } finally {
      setIsSubmittingBriefing(false);
    }
  };

  /* ── Auth rescue screens (unchanged logic) ── */
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

  /* ── Practice division data ── */
  const practices = [
    {
      id: 'division-1',
      tag: isRTL ? 'القسم الأول' : 'Division I',
      title: isRTL ? 'حلول الضيافة' : 'Hospitality Solutions',
      desc: isRTL
        ? 'الهندسة المتميزة وإدارة النمو، من المخطط الأولي إلى النضج التشغيلي الكامل.'
        : 'Engineering excellence. Delivering growth, from blueprint to full operational maturity.',
      services: isRTL
        ? [
            'تطوير الفنادق وتمثيل المالك',
            'تحسين العمليات ودعم ما قبل الافتتاح',
            'دراسات الجدوى والتحقق من الاستثمار',
            'تعزيز تجربة النزيل وتدقيق الجودة',
            'تحسين الأداء التجاري',
          ]
        : [
            'Hotel Development & Owner Representation',
            'Operations Optimisation & Pre-Opening Support',
            'Feasibility Studies & Investment Validation',
            'Guest Experience Enhancement & Quality Audits',
            'Commercial Performance Improvement',
          ],
    },
    {
      id: 'division-2',
      tag: isRTL ? 'القسم الثاني' : 'Division II',
      title: isRTL ? 'حلول نمو الأعمال' : 'Business Growth Solutions',
      desc: isRTL
        ? 'حيث تلتقي الضيافة بالذكاء: استراتيجيات قائمة على البيانات وتميز متمحور حول العنصر البشري.'
        : 'Where hospitality meets intelligence: data-driven strategy, human-centred excellence.',
      services: isRTL
        ? [
            'التخطيط الاستراتيجي وإعادة الهيكلة التنظيمية',
            'تحسين الإيرادات والذكاء الاصطناعي التطبيقي',
            'التحول الرقمي',
            'تطوير القيادة والقدرات',
            'تقييم الاستثمار وفحص الاندماج والاستحواذ',
          ]
        : [
            'Strategic Planning & Organisational Restructuring',
            'Revenue Optimisation & Applied AI',
            'Digital Transformation',
            'Leadership & Capability Development',
            'Investment Appraisal & M&A Due Diligence',
          ],
    },
    {
      id: 'hkp',
      tag: isRTL ? 'المنصة الحصرية' : 'Proprietary Platform',
      title: isRTL ? 'منصة altus للقدرات والأداء' : 'altus Hospitality Knowledge & Performance',
      desc: isRTL
        ? 'من الاستشارة التي تنتهي عند التقرير، إلى بناء وتوطين القدرات داخل مؤسسة المالك.'
        : 'From advice that ends at the report, to capability that lives inside the client\u2019s own institution.',
      services: [],
    },
    {
      id: 'institutional',
      tag: isRTL ? 'القدرات القيادية' : 'What We Bring to the Table',
      title: isRTL ? 'القدرات المؤسسية' : 'Institutional Capabilities',
      desc: isRTL
        ? 'كل مهمة ينفذها الشركاء التنفيذيون مباشرة، بعيداً عن التفويض للمستشارين المبتدئين.'
        : 'Every capability delivered by principals, never delegated to junior benches.',
      services: [],
    },
  ];

  const ascentStages = [
    {
      num: '01',
      title: isRTL ? 'اكتشاف (Discover)' : 'Discover',
      desc: isRTL
        ? 'تشخيص شامل للأصل والسوق والمؤسسة. غرف بيانات، تدقيق ميداني، مقابلات أصحاب المصلحة، ومقارنة تنافسية ترسي الأساس الواقعي.'
        : 'Immersive diagnostic of the asset, market, and organisation. Data rooms, field audits, stakeholder interviews, and competitive benchmarking establish the factual baseline.',
    },
    {
      num: '02',
      title: isRTL ? 'تقييم (Assess)' : 'Assess',
      desc: isRTL
        ? 'تحليل الفجوات مقابل المعايير العالمية وأهداف المستثمر. النمذجة المالية وتحديد المخاطر وحجم الفرصة يحوّلان النتائج إلى قضية تغيير مُقاسة.'
        : 'Gap analysis against global standards and investor objectives. Financial modelling, risk mapping, and opportunity sizing convert findings into a quantified case for change.',
    },
    {
      num: '03',
      title: isRTL ? 'تصميم (Design)' : 'Design',
      desc: isRTL
        ? 'المخطط الاستراتيجي: النموذج التشغيلي، الهيكل التجاري، البنية التنظيمية، وخارطة طريق التقنية — لكل منها مالك، مراحل، وأهداف قابلة للقياس.'
        : 'The strategic blueprint: operating model, commercial architecture, organisational structure, and technology roadmap, each with owners, milestones, and measurable targets.',
    },
    {
      num: '04',
      title: isRTL ? 'تحويل (Transform)' : 'Transform',
      desc: isRTL
        ? 'تنفيذ ميداني مباشر جنباً إلى جنب. نندمج مع فرق العميل للتنفيذ والتدريب وتصحيح المسار، لا للمراقبة عن بُعد.'
        : 'Hands-on, shoulder-to-shoulder execution. We embed alongside client teams to implement, coach, and course-correct, not observe from a distance.',
    },
    {
      num: '05',
      title: isRTL ? 'تحسين (Optimise)' : 'Optimise',
      desc: isRTL
        ? 'قياس الأداء ولوحات المتابعة والتحسين التكراري. ضبط أدوات التسعير والتكلفة والجودة وتجربة النزيل وفق بيانات حيّة.'
        : 'Performance instrumentation, dashboarding, and iterative refinement. Pricing, cost, quality, and guest-experience levers tuned against live data.',
    },
    {
      num: '06',
      title: isRTL ? 'توسّع (Scale)' : 'Scale',
      desc: isRTL
        ? 'المأسسة والنمو: أدلة تشغيلية، نقل القدرات، وحوكمة التسليم بحيث يتراكم الزخم بعد انتهاء التكليف بوقت طويل.'
        : 'Institutionalisation and growth: playbooks, capability transfer, and governance handover so momentum compounds long after the engagement concludes.',
    },
  ];

  /* ──────────────── Briefing Form Dialog ──────────────── */
  const briefingDialog = (
    <Dialog open={briefingOpen} onOpenChange={setBriefingOpen}>
      <DialogTrigger asChild>
        <span className="hidden" />
      </DialogTrigger>
      <DialogContent className="bg-[#09101F] border border-amber-500/30 text-white max-w-lg rounded-none p-6 sm:p-8" style={inter}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-amber-400" style={playfair}>
            {isRTL ? 'طلب إحاطة شريك متقدم' : 'Request Partner Briefing'}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs mt-1">
            {isRTL
              ? 'تُعالج جميع الاستفسارات بسرية تامة. سيتواصل معك أحد الشركاء خلال يومي عمل.'
              : 'All inquiries are received in strict confidence. A partner will respond directly within two business days.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleBriefingSubmit(e)} className="space-y-4 mt-4 text-start">
          <div>
            <Label className="text-xs font-semibold text-slate-300">{isRTL ? 'الاسم الكامل' : 'Full Name'}</Label>
            <Input required disabled={isSubmittingBriefing} placeholder={isRTL ? 'مثال: عبد المحسن السعد' : 'e.g. Sultan Al-Rashid'} value={briefingForm.name} onChange={(e) => setBriefingForm({ ...briefingForm, name: e.target.value })} className="bg-[#050A12] border-slate-800 text-white mt-1 focus:border-amber-500 rounded-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-slate-300">{isRTL ? 'البريد الإلكتروني' : 'Corporate Email'}</Label>
              <Input required disabled={isSubmittingBriefing} type="email" placeholder="name@company.sa" value={briefingForm.email} onChange={(e) => setBriefingForm({ ...briefingForm, email: e.target.value })} className="bg-[#050A12] border-slate-800 text-white mt-1 focus:border-amber-500 rounded-none" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-300">{isRTL ? 'رقم الهاتف' : 'Phone Number'}</Label>
              <Input disabled={isSubmittingBriefing} placeholder="+966 50 000 0000" value={briefingForm.phone} onChange={(e) => setBriefingForm({ ...briefingForm, phone: e.target.value })} className="bg-[#050A12] border-slate-800 text-white mt-1 focus:border-amber-500 rounded-none" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-300">{isRTL ? 'اسم الشركة / الأصل' : 'Organization / Asset'}</Label>
            <Input disabled={isSubmittingBriefing} placeholder={isRTL ? 'شركة الفنادق والضيافة' : 'Hospitality Group / Asset Co.'} value={briefingForm.organization} onChange={(e) => setBriefingForm({ ...briefingForm, organization: e.target.value })} className="bg-[#050A12] border-slate-800 text-white mt-1 focus:border-amber-500 rounded-none" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-300">{isRTL ? 'تفاصيل المهمة والاستشارة' : 'Mandate Overview'}</Label>
            <Textarea rows={3} disabled={isSubmittingBriefing} placeholder={isRTL ? 'صف النطاق التشغيلي أو الاستثماري المطلوب...' : 'Briefly describe your operational or advisory mandate...'} value={briefingForm.notes} onChange={(e) => setBriefingForm({ ...briefingForm, notes: e.target.value })} className="bg-[#050A12] border-slate-800 text-white mt-1 focus:border-amber-500 rounded-none" />
          </div>
          <Button type="submit" disabled={isSubmittingBriefing} className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider mt-2 rounded-none disabled:opacity-60">
            {isSubmittingBriefing ? (
              <RefreshCw className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="me-2 h-4 w-4" />
            )}
            {isRTL ? 'إرسال طلب الإحاطة' : 'Submit Confidential Inquiry'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen flex flex-col selection:bg-amber-500/30 selection:text-amber-200" dir={isRTL ? 'rtl' : 'ltr'}>
      {briefingDialog}
      <PublicNavbar />

      {/* ═══════════════════════ SECTION 1: HERO ═══════════════════════ */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-20 px-4 text-center overflow-hidden"
        style={{ background: `linear-gradient(to bottom, ${COLOR.charcoalDeep}, ${COLOR.charcoal})` }}
      >
        {/* Art Deco Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-top bg-no-repeat opacity-40 pointer-events-none"
          style={{ backgroundImage: "url('/hero-art-deco.png')" }}
        />
        {/* Subtle gradient overlay from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#16191E] via-transparent to-transparent pointer-events-none" />

        {/* Floating Concierge Badge Special Component */}
        <div className="absolute bottom-10 right-8 z-20 hidden md:block">
          <FloatingConciergeBadge
            number={isRTL ? '٠١' : '01'}
            label={isRTL ? 'مختارات • الكونسييرج' : 'CONCIERGE • SELECTION'}
          />
        </div>

        <RevealUp className="relative z-10 max-w-4xl mx-auto space-y-8">
          {/* Subtitle / Brand Tag */}
          <div
            className="text-xs sm:text-sm uppercase tracking-[0.25em] font-semibold"
            style={{ ...neueHaas, color: COLOR.copper }}
          >
            {isRTL ? 'معهد المعرفة وأداء الضيافة' : 'ACADEMY AND KNOWLEDGE PERFORMANCE'}
          </div>

          {/* Main Headline */}
          <h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[4.75rem] text-white font-normal leading-[1.02] tracking-[-0.01em]"
            style={canela}
          >
            {isRTL ? (
              <>
                الارتقاء <br />
                بالضيافة <br />
                <span className="italic" style={{ color: COLOR.copper }}>و أداء</span> <br />
                الأعمال.
              </>
            ) : (
              <>
                Knowledge. <br />
                Performance. <br />
                <span className="italic" style={{ color: COLOR.copper }}>Impact.</span>
              </>
            )}
          </h1>

          {/* Sub-headline */}
          <p className="text-base sm:text-lg font-normal max-w-2xl mx-auto leading-relaxed" style={{ ...inter, color: '#94A3B8' }}>
            {isRTL
              ? 'منظومة استشارية نخبوية تجمع بين عمليات الضيافة الفاخرة وذكاء الأعمال المتقدم — مصممة للعقد القادم في المملكة العربية السعودية.'
              : 'A boutique strategy house at the intersection of elite hospitality operations and advanced business intelligence — engineered for the Kingdom\u2019s next decade.'}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2" style={neueHaas}>
            <Button
              size="lg"
              onClick={() => setBriefingOpen(true)}
              className="h-12 px-8 rounded-none text-[11px] font-semibold tracking-[0.2em] uppercase transition-[box-shadow] duration-200 shadow-md hover:shadow-lg"
              style={{ background: COLOR.copper, color: '#FFFFFF' }}
            >
              {isRTL ? 'طلب إحاطة شريك' : 'REQUEST A BRIEFING'}
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                const el = document.querySelector('#practices');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="h-12 px-8 rounded-none border border-white/25 bg-transparent hover:bg-white/10 text-white text-[11px] font-semibold tracking-[0.2em] uppercase transition-[background-color] duration-200"
            >
              {isRTL ? 'استكشف الخدمات' : 'EXPLORE THE PRACTICE'}
            </Button>
          </div>
        </RevealUp>


        {/* Stats Counter Bar - IBM Plex Mono Technical Numbers */}
        <StaggerChildren className="relative z-10 w-full max-w-4xl mx-auto mt-20 pt-10 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '6.1M+', label: isRTL ? 'تأثير إيرادي' : 'Revenue impact' },
            { value: '12', label: isRTL ? 'أطر عمل استراتيجية' : 'Strategic frameworks' },
            { value: '13', label: isRTL ? 'أصل تحت الإشراف' : 'Assets under oversight' },
            { value: '2', label: isRTL ? 'أقسام ممارسة' : 'Practice divisions' },
          ].map((stat) => (
            <motion.div key={stat.label} variants={staggerItem}>
              <div className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ ...mono, color: COLOR.copper }}><CountUp target={stat.value} /></div>
              <div className="text-[11px] uppercase tracking-[0.2em] font-medium mt-2" style={{ ...neueHaas, color: '#94A3B8' }}>{stat.label}</div>
            </motion.div>
          ))}
        </StaggerChildren>
      </section>

      {/* ═══════════════════ SECTION 2: FIDUCIARY (CREAMY WHITE) ═══════════════════ */}
      <section id="about" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.creamyWhite }}>
        <FadeInSection className="max-w-4xl mx-auto space-y-10 text-center">
          <CopperDivider />

          <h2
            className="text-2xl sm:text-4xl md:text-[2.6rem] font-normal leading-[1.35]"
            style={{ ...canela, color: COLOR.charcoal }}
          >
            {isRTL ? (
              <>
                نعطي الاستشارة <span className="italic" style={{ color: COLOR.emerald }}>للمالك</span>، وليس للهيكل الوظيفي.
                تحت معيار أمانة موحد، من التشخيص الأولي حتى التسليم المؤسسي — يقاس نجاحنا بعوائدكم، ونتحمل المسؤولية عن النتيجة وليس التقرير.
              </>
            ) : (
              <>
                We advise <span className="italic" style={{ color: COLOR.emerald }}>owners</span>, not organograms.
                Under one fiduciary standard, from the first empirical diagnostic to the
                institutionalised handover — measured by your returns, accountable
                for the result, not the report.
              </>
            )}
          </h2>

          {/* Three Columns */}
          <div className="grid md:grid-cols-3 gap-8 pt-8 text-start border-t" style={{ borderColor: COLOR.sand }}>
            {[
              {
                title: isRTL ? 'في مصلحة المالك دائماً' : 'Owner-side, always.',
                desc: isRTL ? 'مستقلون تماماً عن المشغلين والعلامات التجارية والموردين.' : 'Independent of operators, brands, and vendors.',
              },
              {
                title: isRTL ? 'التحليلات المبنية على البيانات' : 'Empirical analytics.',
                desc: isRTL ? 'منهجية Six Sigma تدعم كل توصية استشارية.' : 'Six Sigma discipline underpins every recommendation.',
              },
              {
                title: isRTL ? 'نقل القدرات المؤسسية' : 'Institutional transfer.',
                desc: isRTL ? 'كل مهمة تنتهي بتوطين القدرات داخل المؤسسة.' : 'Every engagement ends with institutional capability, not a report on a shelf.',
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ ...neueHaas, color: COLOR.charcoal }}>{col.title}</h4>
                <p className="text-sm leading-relaxed" style={{ ...inter, color: COLOR.slate }}>{col.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-sm pt-4 leading-relaxed max-w-2xl mx-auto" style={{ ...inter, color: COLOR.slate }}>
            {isRTL
              ? 'كل مهمة ينفذها الشركاء التنفيذيون مباشرة، تقاس بعوائد المالك، وتُؤسسن عبر التسليم المنظم.'
              : 'Every capability delivered by principals, measured against owner returns, and institutionalised through structured handover.'}
          </p>
        </FadeInSection>
      </section>

      {/* ═══════════════ SECTION 2B: WHY ALTUS (THE EDGE) ═══════════════ */}
      <section id="why-altus" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.charcoalDeep }}>
        <FadeInSection className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...neueHaas, color: COLOR.copper }}>
              {isRTL ? '03 — ميزة ألتوس' : '03 — The Altus Edge'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl text-white font-normal leading-tight" style={neueHaas}>
              {isRTL ? (
                <>لماذا <span className="italic" style={{ ...canela, color: COLOR.copper }}>ألتوس استشارات.</span></>
              ) : (
                <>Why <span className="italic" style={{ ...canela, color: COLOR.copper }}>Altus Advisory.</span></>
              )}
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mt-5" style={{ ...inter, color: '#94A3B8' }}>
              {isRTL
                ? 'يعمل قطاع الاستشارات غالباً بمعزل: العمليات التقليدية من جهة، والتحول الرقمي من جهة أخرى. صُممت ألتوس لسد هذه الفجوة الهيكلية بولاية واحدة متكاملة.'
                : 'The consulting landscape too often operates in silos: traditional operations on one side, digital transformation on the other. Altus was engineered to close that structural gap with a single, integrated mandate.'}
            </p>
          </div>

          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            {[
              {
                title: isRTL ? 'استشارات في صف المالك' : 'Owner-Side Advisory',
                desc: isRTL
                  ? 'إشراف مستقل وحصري لصالح المالك عبر دورة حياة الأصل الكاملة: حماية الميزانيات، حوكمة اتفاقيات الإدارة، وصون مصالح المستثمر من انحراف المشغل والمقاول.'
                  : 'Independent, client-side oversight across the full asset lifecycle: protecting budgets, governing HMAs, and safeguarding investor interests against operator and contractor drift.',
              },
              {
                title: isRTL ? 'عمق بمستوى المشغّل' : 'Operator-Grade Depth',
                desc: isRTL
                  ? 'قيادة صُقلت داخل أنظمة ماريوت وIHG وستارווود وأكور. أكثر من 60 عاماً من المسؤولية المباشرة عن الأرباح والخسائر، لا أطر نظرية.'
                  : 'Leadership forged inside Marriott, IHG, Starwood, and Accor systems. 60+ combined years of P&L accountability, not theoretical frameworks.',
              },
              {
                title: isRTL ? 'نموذج مزدوج التخصص' : 'A Dual-Discipline Model',
                desc: isRTL
                  ? 'عمليات الضيافة الرفيعة مندمجة مع ذكاء تجاري مدعوم بالذكاء الاصطناعي، لهندسة نمو في المجالين في آن واحد.'
                  : 'Elite hospitality operations fused with AI-enabled commercial intelligence, engineering growth across both domains simultaneously.',
              },
              {
                title: isRTL ? 'الأدلة قبل الحدس' : 'Evidence over Intuition',
                desc: isRTL
                  ? 'تحليلات تجريبية، نمذجة مالية، وانضباط Six Sigma يحل محل الرأي. كل توصية قابلة للقياس والتدقيق.'
                  : 'Empirical analytics, financial modelling, and Six Sigma discipline replace opinion. Every recommendation is measurable and auditable.',
              },
              {
                title: isRTL ? 'فصاحة إقليمية، معايير عالمية' : 'Regional Fluency, Global Standards',
                desc: isRTL
                  ? 'معرفة عميقة الجذور بأسواق السعودية والخليج، وتنفيذ ثنائي اللغة، مع معايير عالمية من الفئة الأولى دون أي تخفيف.'
                  : 'Deep-rooted Saudi and GCC market knowledge, bilingual delivery, and Tier-1 international benchmarks applied without dilution.',
              },
              {
                title: isRTL ? 'شراكة دائمة' : 'An Enduring Partnership',
                desc: isRTL
                  ? 'توجيه ميداني مباشر من أول مخطط حتى التنفيذ المستدام: علاقة تتجاوز عمر التكليف نفسه.'
                  : 'Hands-on guidance from first blueprint to sustained execution: a relationship that outlives the engagement itself.',
              },
            ].map((edge) => (
              <div key={edge.title} className="p-8 sm:p-9 hover:bg-white/[0.03] transition-colors duration-300" style={{ backgroundColor: COLOR.charcoalDeep }}>
                <h4 className="text-lg text-white font-medium mb-3" style={neueHaas}>{edge.title}</h4>
                <p className="text-sm leading-relaxed" style={{ ...inter, color: '#94A3B8' }}>{edge.desc}</p>
              </div>
            ))}
          </StaggerChildren>

          <div className="mt-10 p-8 sm:p-10 border" style={{ borderColor: `${COLOR.copper}40`, backgroundColor: `${COLOR.copper}0D` }}>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ ...neueHaas, color: COLOR.copper }}>
              {isRTL ? 'عرض القيمة الفريد' : 'Unique Value Proposition'}
            </div>
            <p className="text-base sm:text-lg leading-relaxed text-white" style={canela}>
              {isRTL
                ? 'تميّز تشغيلي رفيع في الضيافة، مندمج مع ذكاء إيرادي مدعوم بالذكاء الاصطناعي: أثر ملموس عبر وضوح استراتيجي، وانضباط تشغيلي، وابتكار رقمي متواصل.'
                : 'High-level hospitality operational excellence, integrated with AI-driven revenue intelligence: delivering measurable impact through strategic clarity, operational rigour, and continuous digital innovation.'}
            </p>
          </div>
        </FadeInSection>
      </section>

      {/* ═══════════════ SECTION 3: TWO DIVISIONS (CHARCOAL) ═══════════════ */}
      <section id="practices" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.charcoal }}>
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="mb-12">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...neueHaas, color: COLOR.copper }}>
              {isRTL ? '04–05 — محفظة الخدمات' : '04–05 — Service Portfolio'}
            </div>
            <h2
              className="text-3xl sm:text-5xl md:text-6xl text-white font-normal leading-tight"
              style={neueHaas}
            >
              {isRTL ? (
                <>قسمان استشاريان. <span className="italic" style={{ ...canela, color: COLOR.copper }}>منصة حصريّة واحدة.</span></>
              ) : (
                <>Two divisions. <span className="italic" style={{ ...canela, color: COLOR.copper }}>One proprietary platform.</span></>
              )}
            </h2>
          </FadeInSection>

          <StaggerChildren className="grid md:grid-cols-2 gap-6">
            {practices.filter((pr) => pr.id !== 'hkp' && pr.id !== 'institutional').map((pr) => (
              <motion.div
                variants={staggerItem}
                key={pr.id}
                className="p-8 sm:p-10 border border-white/10 hover:border-[#C45B2F]/50 transition-[border-color,box-shadow] duration-200 group relative overflow-hidden flex flex-col shadow-sm hover:shadow-md"
                style={{ backgroundColor: COLOR.charcoalDeep }}
              >
                <div className="relative z-10 flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3" style={{ ...neueHaas, color: COLOR.copper }}>
                    {pr.tag}
                  </div>
                  <h3 className="text-xl sm:text-2xl text-white font-medium mb-3" style={neueHaas}>{pr.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed mb-6" style={{ ...inter, color: '#94A3B8' }}>{pr.desc}</p>

                  <ul className="space-y-2.5 mb-8 border-t pt-5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    {pr.services.map((s) => (
                      <li key={s} className="text-xs sm:text-sm text-slate-300 flex items-start gap-2.5" style={inter}>
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: COLOR.copper }} />
                        {s}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => setBriefingOpen(true)}
                    className="text-[11px] font-semibold tracking-[0.15em] uppercase flex items-center gap-2 group-hover:text-white transition-colors duration-300"
                    style={{ ...neueHaas, color: COLOR.copper }}
                  >
                    <span>{isRTL ? 'استكشف' : 'EXPLORE'}</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                </div>
              </motion.div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ═══════════════ SECTION 3B: ALTUS HK&P PLATFORM (CREAMY WHITE) ═══════════════ */}
      <section id="platform" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.creamyWhite }}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mb-14">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 text-white" style={{ ...neueHaas, backgroundColor: COLOR.emerald }}>
                {isRTL ? 'جديد' : 'NEW'}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ ...neueHaas, color: COLOR.copper }}>
                {isRTL ? '06 — المنصة الرقمية الحصرية' : '06 — Proprietary Digital Platform'}
              </span>
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-normal leading-tight" style={{ ...neueHaas, color: COLOR.charcoal }}>
              altus <span className="italic" style={{ ...canela, color: COLOR.emerald }}>{isRTL ? 'للمعرفة والأداء' : 'Hospitality Knowledge & Performance'}</span>
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mt-5" style={{ ...inter, color: COLOR.slate }}>
              {isRTL
                ? 'منتج استراتيجي حصري يحوّل ثلاثة عقود من الخبرة الفندقية ومعايير التشغيل إلى نظام رقمي منظم للتعلم وإدارة المعرفة وقياس الأداء، مصمم خصيصاً للفنادق المستقلة والشقق الفندقية والمنشآت الصغيرة والمتوسطة في المملكة والمنطقة العربية.'
                : 'A strategic Altus product that converts three decades of hotel expertise and operating standards into a structured digital system for learning, knowledge management, and performance measurement — purpose-built for independent hotels, serviced apartments, and SME establishments across Saudi Arabia and the Arab region.'}
            </p>
            <p className="text-base sm:text-lg italic mt-6 pl-5 border-l-2" style={{ ...canela, color: COLOR.charcoal, borderColor: COLOR.copper }}>
              {isRTL
                ? '"المعرفة الصحيحة، للشخص الصحيح، في الوقت الصحيح، مع دليل واضح على التعلّم والتحسّن."'
                : '“The right knowledge, to the right person, at the right time, with clear evidence of learning and improvement.”'}
            </p>
          </div>

          {/* Five integrated layers */}
          <div className="mb-16">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ ...neueHaas, color: COLOR.charcoal }}>
              {isRTL ? 'خمس طبقات متكاملة' : 'Five Integrated Layers'}
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                {
                  n: '01',
                  t: isRTL ? 'المنتج والتجربة' : 'Product & Experience',
                  d: isRTL ? 'نطاق واضح وتجربة متسقة عبر بنية المعلومات وواجهة المستخدم.' : 'Clear scope and a consistent experience across information architecture and UX.',
                },
                {
                  n: '02',
                  t: isRTL ? 'المعرفة والتعلّم' : 'Knowledge & Learning',
                  d: isRTL ? 'بنية معرفية، منهج رئيسي، محرك تعلّم، تقييم وشهادات.' : 'Knowledge architecture, master curriculum, learning engine, assessment and certification.',
                },
                {
                  n: '03',
                  t: isRTL ? 'الذكاء والأداء' : 'Intelligence & Performance',
                  d: isRTL ? 'محرك معرفي، بحث ذكي، مساعد ذكاء اصطناعي محكوم، ومؤشرات أداء حية.' : 'Knowledge engine, smart search, governed AI assistant, and live performance indicators.',
                },
                {
                  n: '04',
                  t: isRTL ? 'العمليات التقنية' : 'Technical Operations',
                  d: isRTL ? 'قاعدة بيانات، هوية وصلاحيات، تخصيص لكل منشأة، إدارة وتقارير.' : 'Database, identity and permissions, per-property customisation, admin and reporting.',
                },
                {
                  n: '05',
                  t: isRTL ? 'الحوكمة والنمو' : 'Governance & Growth',
                  d: isRTL ? 'أمن وخصوصية، ضبط الإصدارات، خارطة طريق المنتج، قنوات ويب وجوال.' : 'Security and privacy, version control, product roadmap, web and mobile channels.',
                },
              ].map((layer) => (
                <div key={layer.n} className="p-6 border" style={{ backgroundColor: COLOR.ivory, borderColor: COLOR.sand }}>
                  <div className="text-2xl font-semibold mb-3" style={{ ...mono, color: COLOR.copper }}>{layer.n}</div>
                  <h4 className="text-sm font-bold mb-2" style={{ ...neueHaas, color: COLOR.charcoal }}>{layer.t}</h4>
                  <p className="text-xs leading-relaxed" style={{ ...inter, color: COLOR.slate }}>{layer.d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Master curriculum */}
          <div className="mb-16">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ ...neueHaas, color: COLOR.charcoal }}>
              {isRTL ? 'المنهج الرئيسي: عشرة مجالات مهنية' : 'Master Curriculum: Ten Professional Domains'}
            </h3>
            <p className="text-xs mb-6" style={{ ...inter, color: COLOR.slate }}>
              {isRTL
                ? 'نموذج محتوى منظم: المجال المهني ← المسار ← الوحدة ← الدرس ← التقييم والشهادة'
                : 'Structured content model: Professional Domain → Track → Module → Lesson → Assessment & Certification'}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {(isRTL
                ? ['أساسيات الفندقة', 'الاستقبال', 'التدبير المنزلي', 'الأطعمة والمشروبات', 'المطبخ', 'المبيعات والتسويق', 'الإيرادات والحجوزات', 'تجربة النزيل', 'الجودة والتدقيق', 'الأمن والسلامة']
                : ['Hotel Fundamentals', 'Front Office', 'Housekeeping', 'Food & Beverage', 'Kitchen', 'Sales & Marketing', 'Revenue & Reservations', 'Guest Experience', 'Quality & Audit', 'Security & Safety']
              ).map((d) => (
                <span key={d} className="text-xs px-3.5 py-2 border font-medium" style={{ ...neueHaas, color: COLOR.charcoal, backgroundColor: COLOR.ivory, borderColor: COLOR.sand }}>{d}</span>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {[
                { t: isRTL ? 'ثنائي اللغة بالتصميم' : 'Bilingual by design', d: isRTL ? 'العربية والإنجليزية، بتجربة واحدة' : 'Arabic and English, one experience' },
                { t: isRTL ? 'علامة خاصة لكل منشأة' : 'White-label per property', d: isRTL ? 'علامة كل منشأة الخاصة بها' : 'Each establishment’s own brand' },
                { t: isRTL ? 'مساعد ذكاء اصطناعي محكوم' : 'Governed AI assistant', d: isRTL ? 'إجابات من المحتوى المعتمد فقط' : 'Answers only from approved content' },
                { t: isRTL ? 'دليل على التقدّم' : 'Evidence of progress', d: isRTL ? 'لوحات، تقارير، وشهادات' : 'Dashboards, reports, certification' },
              ].map((f) => (
                <div key={f.t}>
                  <h5 className="text-xs font-bold" style={{ ...neueHaas, color: COLOR.charcoal }}>{f.t}</h5>
                  <p className="text-xs" style={{ ...inter, color: COLOR.slate }}>{f.d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Measurable value stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 pt-8 border-t" style={{ borderColor: COLOR.sand }}>
            {[
              { v: '>40%', l: isRTL ? 'إعداد أسرع للموظفين' : 'faster onboarding readiness' },
              { v: '100%', l: isRTL ? 'حصانة من دوران الموظفين' : 'turnover immunity' },
              { v: '100s', l: isRTL ? 'ساعات تدريب موفّرة' : 'of training hours saved' },
              { v: 'GOP ↑', l: isRTL ? 'رضا النزيل والأرباح' : 'guest satisfaction & profit' },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ ...mono, color: COLOR.emerald }}>{s.v}</div>
                <div className="text-[11px] uppercase tracking-wide font-medium mt-2" style={{ ...neueHaas, color: COLOR.slate }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Competitive comparison */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ ...neueHaas, color: COLOR.charcoal }}>
              {isRTL ? '07 — لماذا لا تقدّم أي شركة مماثلة هذا' : '07 — Why No Comparable Firm Offers This'}
            </h3>
            <div className="overflow-x-auto border" style={{ borderColor: COLOR.sand }}>
              <table className="w-full text-start" style={inter}>
                <thead>
                  <tr className="border-b" style={{ backgroundColor: COLOR.sand + '33', borderColor: COLOR.sand }}>
                    <th className="p-4 text-[11px] uppercase tracking-wider font-bold text-start" style={{ ...neueHaas, color: COLOR.charcoal }}>{isRTL ? 'البُعد' : 'Dimension'}</th>
                    <th className="p-4 text-[11px] uppercase tracking-wider font-bold text-start" style={{ ...neueHaas, color: COLOR.slate }}>{isRTL ? 'الشركة الاستشارية التقليدية' : 'Typical Consultancy'}</th>
                    <th className="p-4 text-[11px] uppercase tracking-wider font-bold text-start" style={{ ...neueHaas, color: COLOR.slate }}>{isRTL ? 'أنظمة التدريب العامة' : 'Generic LMS / Vendor'}</th>
                    <th className="p-4 text-[11px] uppercase tracking-wider font-bold text-start" style={{ ...neueHaas, color: COLOR.emerald }}>Altus HK&P</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      d: isRTL ? 'مصدر المحتوى' : 'Source of content',
                      a: isRTL ? 'أطر خارجية، عروض عامة' : 'External frameworks, generic decks',
                      b: isRTL ? 'مكتبات جاهزة، بلا معايير فندقية' : 'Off-the-shelf libraries, no hotel standards',
                      c: isRTL ? 'ثلاثة عقود من معايير التشغيل الميدانية' : 'Three decades of operator-grade, field-tested standards',
                    },
                    {
                      d: isRTL ? 'بعد انتهاء التكليف' : 'After the engagement',
                      a: isRTL ? 'يرحل مع المستشارين' : 'Knowledge leaves with the consultants',
                      b: isRTL ? 'يتقادم المحتوى دون ملكية' : 'Content ages without ownership',
                      c: isRTL ? 'معرفة مؤسسية موثقة ومحدّثة باستمرار' : 'Knowledge stays institutionalised, versioned, and continuously updated',
                    },
                    {
                      d: isRTL ? 'الملاءمة للمنشأة' : 'Fit to the property',
                      a: isRTL ? 'توصيات موحّدة' : 'One-size recommendations',
                      b: isRTL ? 'بدون تخصيص أو عمق عربي' : 'No customisation, no Arabic depth',
                      c: isRTL ? 'علامة خاصة، ثنائية اللغة، مخصصة للمنشأة والدور' : 'White-label, bilingual, tailored per property, role, and standard',
                    },
                    {
                      d: isRTL ? 'إثبات التبنّي' : 'Proof of adoption',
                      a: isRTL ? 'لا شيء بعد تسليم التقرير' : 'None once the report is delivered',
                      b: isRTL ? 'نقرات إتمام لا كفاءة' : 'Completion clicks, not competence',
                      c: isRTL ? 'تقييم وشهادات ولوحات كفاءة لكل موظف' : 'Assessment, certification, and competency dashboards per employee',
                    },
                    {
                      d: isRTL ? 'الذكاء' : 'Intelligence',
                      a: isRTL ? 'مستندات ثابتة' : 'Static documents',
                      b: isRTL ? 'بحث بالكلمات المفتاحية على الأكثر' : 'Keyword search at best',
                      c: isRTL ? 'مساعد ذكاء اصطناعي محكوم يجيب من المحتوى المعتمد حصراً' : 'Governed AI assistant answering strictly from approved content',
                    },
                  ].map((row) => (
                    <tr key={row.d} className="border-b last:border-0" style={{ borderColor: COLOR.sand }}>
                      <td className="p-4 text-xs font-bold align-top" style={{ ...neueHaas, color: COLOR.charcoal }}>{row.d}</td>
                      <td className="p-4 text-xs align-top" style={{ ...inter, color: COLOR.slate }}>{row.a}</td>
                      <td className="p-4 text-xs align-top" style={{ ...inter, color: COLOR.slate }}>{row.b}</td>
                      <td className="p-4 text-xs align-top font-medium" style={{ ...inter, color: COLOR.emerald, backgroundColor: `${COLOR.emerald}0D` }}>{row.c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 3C: INDUSTRIES WE SERVE (CHARCOAL) ═══════════════ */}
      <section id="industries" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.charcoal }}>
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...neueHaas, color: COLOR.copper }}>
            {isRTL ? '08 — تغطية القطاعات' : '08 — Sector Coverage'}
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl text-white font-normal leading-tight mb-6" style={neueHaas}>
            {isRTL ? (
              <>القطاعات <span className="italic" style={{ ...canela, color: COLOR.copper }}>التي نخدمها.</span></>
            ) : (
              <>Industries <span className="italic" style={{ ...canela, color: COLOR.copper }}>we serve.</span></>
            )}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mb-14" style={{ ...inter, color: '#94A3B8' }}>
            {isRTL
              ? 'فلسفة تشغيلية واحدة، مطبقة عبر القطاعات التي تقود تحول المملكة، أينما تحدّد الخدمة وأداء الأصل وتجربة النزيل النتيجة.'
              : 'One operating philosophy, applied across the sectors driving the Kingdom’s transformation, wherever service, asset performance, and guest experience decide the outcome.'}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {(isRTL
              ? ['الفنادق', 'المنتجعات الفاخرة', 'السياحة والوجهات', 'العقارات', 'الحكومة والهيئات', 'التطويرات متعددة الاستخدام', 'الترفيه', 'الرعاية الصحية', 'المطاعم والضيافة بالتجزئة', 'الرياضة والفعاليات', 'الاستثمار والأسهم الخاصة', 'المكاتب العائلية']
              : ['Hotels', 'Luxury Resorts', 'Tourism & Destinations', 'Real Estate', 'Government & PSAs', 'Mixed-Use Developments', 'Entertainment', 'Healthcare', 'Hospitality Retail & F&B', 'Sports & Events', 'Investment & PE', 'Family Offices']
            ).map((ind) => (
              <span
                key={ind}
                className="text-xs px-5 py-2.5 border border-white/15 text-slate-300 hover:border-[#C45B2F] hover:text-white transition-colors duration-300 font-medium"
                style={{ ...neueHaas, backgroundColor: COLOR.charcoalDeep }}
              >
                {ind}
              </span>
            ))}
          </div>

          <p className="text-xs text-slate-400 max-w-xl mx-auto mt-14 italic" style={inter}>
            {isRTL
              ? 'ملتزمون في كل مقياس: من منشأة مستقلة بوتيكية في خطواتها الأولى، إلى محافظ وطنية ومؤسسات عالمية. العناية والتفاني والدقة الاستراتيجية ذاتها.'
              : 'Committed at every scale: from a boutique independent property taking its first steps, to national portfolios and global enterprises. The same exacting care, dedication, and strategic rigour.'}
          </p>
        </div>
      </section>

      {/* ═══════════════ SECTION 4: ALTUS ASCENT™ (CREAMY WHITE) ═══════════════ */}

      <section id="ascent" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.creamyWhite }}>
        <div className="max-w-5xl mx-auto">
          <FadeInSection className="text-center space-y-4 mb-16">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ ...neueHaas, color: COLOR.copper }}>
              {isRTL ? '09 — المنهجية الحصرية' : '09 — Proprietary Methodology'}
            </div>
            <h2
              className="text-3xl sm:text-5xl md:text-6xl font-normal"
              style={{ ...neueHaas, color: COLOR.charcoal }}
            >
              The Altus <span className="italic" style={{ ...canela, color: COLOR.emerald }}>Ascent™</span>
            </h2>
            <p className="text-sm max-w-xl mx-auto" style={{ ...inter, color: COLOR.slate }}>
              {isRTL
                ? 'انضباط تشغيلي سداسي المراحل ينقل كل تكليف من التشخيص الأول إلى أداء مأسسن ذاتي الاستدامة، بمعايير عبور، ومخرجات، وتوقيع مالك واضح في كل مرحلة.'
                : 'A six-stage operating discipline that carries every mandate from first diagnostic to institutionalised, self-sustaining performance, with defined gates, deliverables, and owner sign-off at each stage.'}
            </p>
          </FadeInSection>

          <StaggerChildren className="space-y-4" staggerDelay={0.06}>
            {ascentStages.map((stg) => (
              <motion.div
                variants={staggerItem}
                key={stg.num}
                className="p-6 sm:p-8 border flex flex-col sm:flex-row items-start gap-5 hover:shadow-md transition-shadow duration-300"
                style={{ backgroundColor: COLOR.ivory, borderColor: COLOR.sand }}
              >
                <div className="text-3xl font-semibold shrink-0" style={{ ...mono, color: COLOR.copper }}>{stg.num}</div>
                <div className="space-y-1.5">
                  <h4 className="text-lg sm:text-xl font-medium" style={{ ...neueHaas, color: COLOR.charcoal }}>{stg.title}</h4>
                  <p className="text-sm leading-relaxed" style={{ ...inter, color: COLOR.slate }}>{stg.desc}</p>
                </div>
              </motion.div>
            ))}
          </StaggerChildren>

          <p className="text-center text-sm italic mt-10" style={{ ...canela, color: COLOR.charcoal }}>
            {isRTL ? 'الدقة في التخطيط. التميّز في التنفيذ.' : 'Precision in planning. Excellence in execution.'}
          </p>

          <div className="text-center mt-6">
            <button
              onClick={() => setBriefingOpen(true)}
              className="text-[11px] font-semibold tracking-[0.15em] uppercase flex items-center gap-2 mx-auto transition-colors duration-300 hover:opacity-80"
              style={{ ...neueHaas, color: COLOR.emerald }}
            >
              <span>{isRTL ? 'المنهجية الكاملة' : 'THE FULL METHODOLOGY'}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 4B: STRATEGIC FRAMEWORKS (CHARCOAL) ═══════════════ */}
      <section id="frameworks" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.charcoal }}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...neueHaas, color: COLOR.copper }}>
              {isRTL ? '10 — نماذج استشارية أصيلة' : '10 — Original Consulting Models'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl text-white font-normal leading-tight" style={neueHaas}>
              {isRTL ? (
                <>الأطر <span className="italic" style={{ ...canela, color: COLOR.copper }}>الاستراتيجية.</span></>
              ) : (
                <>Strategic <span className="italic" style={{ ...canela, color: COLOR.copper }}>Frameworks.</span></>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mt-5" style={{ ...inter, color: '#94A3B8' }}>
              {isRTL
                ? 'عدستان حصريتان تقرأ من خلالهما ألتوس أي أصل: تحديد موقعه على خريطة الأداء، ثم هندسة المسار نحو عوائد متراكمة.'
                : 'Two proprietary lenses through which Altus reads an asset: locating it on the performance map, then engineering the route to compounding returns.'}
            </p>
          </div>

          {/* A. Altus Performance Matrix */}
          <div className="mb-20">
            <h3 className="text-base sm:text-lg text-white font-medium mb-6" style={neueHaas}>
              A. {isRTL ? 'مصفوفة أداء ألتوس™' : 'The Altus Performance Matrix™'}
            </h3>
            <div className="grid grid-cols-2 gap-px" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <div className="p-6 sm:p-8" style={{ backgroundColor: COLOR.charcoalDeep }}>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-2 text-slate-400" style={neueHaas}>{isRTL ? 'المشغّل التقليدي' : 'Legacy Operator'}</div>
                <p className="text-xs sm:text-sm text-slate-400" style={inter}>{isRTL ? 'عمليات سليمة، محرك تجاري تناظري.' : 'Sound operations, analogue commercial engine.'}</p>
              </div>
              <div className="p-6 sm:p-8 border" style={{ backgroundColor: `${COLOR.copper}15`, borderColor: COLOR.copper }}>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ ...neueHaas, color: COLOR.copper }}>{isRTL ? 'منطقة ألتوس' : 'The Altus Zone'}</div>
                <p className="text-xs sm:text-sm text-white font-medium" style={inter}>{isRTL ? 'تميّز تشغيلي × ذكاء رقمي: أداء متراكم.' : 'Operational mastery × digital intelligence: compounding performance.'}</p>
              </div>
              <div className="p-6 sm:p-8" style={{ backgroundColor: COLOR.charcoalDeep }}>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-2 text-slate-400" style={neueHaas}>{isRTL ? 'أصل دون إدارة كافية' : 'Undermanaged Asset'}</div>
                <p className="text-xs sm:text-sm text-slate-400" style={inter}>{isRTL ? 'رأس مال موظّف، إمكانات غير محققة.' : 'Capital deployed, potential unrealised.'}</p>
              </div>
              <div className="p-6 sm:p-8" style={{ backgroundColor: COLOR.charcoalDeep }}>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-2 text-slate-400" style={neueHaas}>{isRTL ? 'واجهة رقمية سطحية' : 'Digital Veneer'}</div>
                <p className="text-xs sm:text-sm text-slate-400" style={inter}>{isRTL ? 'تقنية معتمدة، عمليات غير مدعومة بما يكفي.' : 'Technology adopted, operations underpowered.'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 text-[10px] uppercase tracking-widest text-slate-400 font-medium" style={neueHaas}>
              <span>{isRTL ? '↑ الدقة التشغيلية' : '↑ Operational Rigour'}</span>
              <span>{isRTL ? 'الذكاء الرقمي والتجاري →' : 'Digital & Commercial Intelligence →'}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-4 max-w-lg" style={inter}>
              {isRTL
                ? 'مهمتنا: نقل كل أصل عميل إلى الأعلى واليمين، إلى داخل منطقة ألتوس.'
                : 'Our mandate: move every client asset up and to the right, into the Altus Zone.'}
            </p>
          </div>

          {/* B. GOPPAR Value Stack */}
          <div>
            <h3 className="text-base sm:text-lg text-white font-medium mb-6" style={neueHaas}>
              B. {isRTL ? 'حزمة قيمة GOPPAR™' : 'The GOPPAR Value Stack™'}
            </h3>
            <div className="space-y-2">
              {[
                {
                  t: isRTL ? 'استيعاب الإيرادات الأولية' : 'Top-Line Capture',
                  d: isRTL ? 'تسعير ديناميكي • عائد تنبؤي • أنظمة إيراد شاملة' : 'Dynamic pricing • predictive yield • total revenue systems',
                },
                {
                  t: isRTL ? 'اقتصاديات التوزيع' : 'Distribution Economics',
                  d: isRTL ? 'تحسين مزيج القنوات • حوكمة OTA • نمو الحجز المباشر' : 'Channel-mix optimisation • OTA governance • direct-booking growth',
                },
                {
                  t: isRTL ? 'احتواء التكاليف' : 'Cost Containment',
                  d: isRTL ? 'أطر تكلفة هجومية • انضباط المشتريات • الإنتاجية' : 'Offensive cost frameworks • procurement discipline • productivity',
                },
                {
                  t: isRTL ? 'إنتاجية الأصل' : 'Asset Productivity',
                  d: isRTL ? 'استثمار المساحة • حوكمة الإنفاق الرأسمالي • كفاءة الطاقة ودورة الحياة' : 'Space monetisation • capex governance • energy & lifecycle efficiency',
                },
              ].map((tier, i) => (
                <div
                  key={tier.t}
                  className="p-5 sm:p-6 border-s-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6"
                  style={{ backgroundColor: COLOR.charcoalDeep, borderColor: COLOR.copper, opacity: 1 - i * 0.12 }}
                >
                  <div className="text-xs font-bold uppercase tracking-wider w-full sm:w-56 shrink-0" style={{ ...neueHaas, color: COLOR.copper }}>{tier.t}</div>
                  <div className="text-xs sm:text-sm text-slate-300" style={inter}>{tier.d}</div>
              </div>
            ))}
              <div className="p-5 sm:p-6 text-center" style={{ backgroundColor: COLOR.copper }}>
                <div className="text-sm font-bold uppercase tracking-[0.2em] text-white" style={neueHaas}>
                  {isRTL ? 'توسّع GOPPAR' : 'GOPPAR Expansion'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 4C: INSTITUTIONAL CAPABILITIES (CREAMY WHITE) ═══════════════ */}
      <section id="capabilities" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.creamyWhite }}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...neueHaas, color: COLOR.copper }}>
              {isRTL ? '11 — ما نقدّمه' : '11 — What We Bring to the Table'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-normal leading-tight" style={{ ...neueHaas, color: COLOR.charcoal }}>
              {isRTL ? (
                <>القدرات <span className="italic" style={{ ...canela, color: COLOR.emerald }}>المؤسسية.</span></>
              ) : (
                <>Institutional <span className="italic" style={{ ...canela, color: COLOR.emerald }}>Capabilities.</span></>
              )}
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mt-5" style={{ ...inter, color: COLOR.slate }}>
              {isRTL
                ? 'ثماني مجموعات قدرات متكاملة، تُنشر بشكل انتقائي حسب كل تكليف، دائماً مجتمعة، ولا تُستخدم أبداً بمعزل عن غيرها.'
                : 'Eight integrated capability sets, deployed selectively per mandate, always in combination, never in isolation.'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ backgroundColor: COLOR.sand }}>
            {[
              {
                t: isRTL ? 'التشغيل' : 'Operational',
                d: isRTL ? 'بنية إجراءات التشغيل، أنظمة الجودة، جاهزية ما قبل الافتتاح، وهندسة تقديم الخدمة عبر الغرف والأطعمة والمشروبات ووظائف الدعم.' : 'SOP architecture, quality systems, pre-opening readiness, service-delivery engineering across rooms, F&B, and support functions.',
              },
              {
                t: isRTL ? 'التجاري' : 'Commercial',
                d: isRTL ? 'استراتيجية الإيرادات، فعالية قوة المبيعات، اقتصاديات التوزيع والقنوات، وأداء العلامة والتسويق.' : 'Revenue strategy, sales-force effectiveness, distribution and channel economics, brand and marketing performance.',
              },
              {
                t: isRTL ? 'المالي' : 'Financial',
                d: isRTL ? 'إعادة هيكلة الأرباح والخسائر، أطر احتواء التكلفة، انضباط الميزانية والتنبؤ، وحوكمة الإنفاق الرأسمالي.' : 'P&L restructuring, cost-containment frameworks, budgeting and forecasting discipline, capex governance and ROI tracking.',
              },
              {
                t: isRTL ? 'الاستثمار' : 'Investment',
                d: isRTL ? 'التحقق من الجدوى، دعم الاكتتاب، الفحص النافي للجهالة، والتقييم ونمذجة التآزر للاستحواذ والتطوير.' : 'Feasibility validation, underwriting support, due diligence, valuation and synergy modelling for acquisitions and development.',
              },
              {
                t: isRTL ? 'الرقمنة والذكاء الاصطناعي' : 'Digital & AI',
                d: isRTL ? 'تقييم الجاهزية للذكاء الاصطناعي، التسعير الديناميكي، التحليلات التنبؤية، تحديث CRM والبنية التقنية، ومنصة altus HK&P.' : 'AI-readiness assessment, dynamic pricing, predictive analytics, CRM and technology-stack modernisation, plus the altus HK&P platform.',
              },
              {
                t: isRTL ? 'التنظيمي' : 'Organisational',
                d: isRTL ? 'إعادة تصميم الهيكل، وضوح الأدوار، تخطيط التعاقب، تدريب القيادة، وبرامج نقل القدرات.' : 'Structure redesign, role clarity, succession planning, leadership coaching, and capability-transfer programmes.',
              },
              {
                t: isRTL ? 'الحوكمة' : 'Governance',
                d: isRTL ? 'الإشراف على اتفاقيات إدارة الفنادق، مواءمة المالك والمشغل، تطبيق بنود الأداء، وضمان التقارير على مستوى مجلس الإدارة.' : 'HMA oversight, owner and operator alignment, performance-clause enforcement, reporting and board-level assurance.',
              },
              {
                t: isRTL ? 'التحوّل' : 'Transformation',
                d: isRTL ? 'إدارة التحول، بروتوكولات التغيير، الدمج بعد الاستحواذ، وبرامج الأداء على مستوى المؤسسة.' : 'Turnaround management, change protocols, post-merger integration, and enterprise-wide performance programmes.',
              },
            ].map((cap) => (
              <div key={cap.t} className="p-6 sm:p-7" style={{ backgroundColor: COLOR.ivory }}>
                <h4 className="text-sm font-bold mb-2.5" style={{ ...neueHaas, color: COLOR.charcoal }}>{cap.t}</h4>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ ...inter, color: COLOR.slate }}>{cap.d}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-sm italic mt-10" style={{ ...canela, color: COLOR.charcoal }}>
            {isRTL
              ? 'كل قدرة يقدّمها شركاء تنفيذيون مباشرة، لا تُفوَّض أبداً لمستشارين مبتدئين.'
              : 'Every capability is delivered by principals, never delegated to junior benches.'}
          </p>
        </div>
      </section>

      {/* ═══════════════ SECTION 4D: SAUDI VISION 2030 (CHARCOAL) ═══════════════ */}
      <section id="vision2030" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.charcoal }}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...neueHaas, color: COLOR.copper }}>
              {isRTL ? '12 — التوافق الوطني' : '12 — National Alignment'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl text-white font-normal leading-tight" style={neueHaas}>
              {isRTL ? (
                <>مهندسة لخدمة <span className="italic" style={{ ...canela, color: COLOR.copper }}>رؤية السعودية 2030.</span></>
              ) : (
                <>Engineered for <span className="italic" style={{ ...canela, color: COLOR.copper }}>Saudi Vision 2030.</span></>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mt-5" style={{ ...inter, color: '#94A3B8' }}>
              {isRTL
                ? 'رؤية 2030 ليست مخططاً للمستقبل، بل تحوّل حي وعالمي النطاق. عملت ألتوس استشارات على مواءمة رسالتها وبنية خدماتها مع الركائز الأساسية للمملكة، بحيث لا يكتفي شركاؤنا بالمشاركة في هذا النمو التاريخي، بل يقودونه.'
                : 'Vision 2030 is not a blueprint of the future. It is a live, global-scale transformation. Altus Advisory has aligned its mission and service architecture to directly support the Kingdom’s core pillars, so our partners do not merely participate in this historic growth: they lead it.'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                p: isRTL ? 'الركيزة الأولى' : 'Pillar I',
                t: isRTL ? 'تعزيز طفرة السياحة والضيافة' : 'Powering the Tourism & Hospitality Surge',
                d: isRTL
                  ? 'مع استهداف المملكة 150 مليون زيارة سنوياً بحلول 2030، نعمل كأمناء استراتيجيين للمطورين والمستثمرين: تمثيل المالك، التحقق من الجدوى، والتحسين التشغيلي الذي يسلّم أصولاً فندقية جديدة في الوقت والميزانية المحددين ومصممة لتحقيق الأرباح من اليوم الأول.'
                  : 'With the Kingdom targeting 150 million annual visits by 2030, we act as strategic fiduciary to developers and investors: owner representation, feasibility validation, and operational optimisation that deliver new hotel assets on time, on budget, and engineered for GOP from day one.',
              },
              {
                p: isRTL ? 'الركيزة الثانية' : 'Pillar II',
                t: isRTL ? 'تطوير الريادة الرقمية والذكاء الاصطناعي' : 'Advancing Digital & AI Leadership',
                d: isRTL
                  ? 'دعم مجتمع رقمي واقتصاد موجّه للتقنية: تسعير ديناميكي مدعوم بالذكاء الاصطناعي، إدارة إيراد تنبؤية، وتسويق رقمي متقدم. منصتنا altus HK&P تستبدل الإجراءات الورقية بنظام رقمي محكوم يرسّخ الشفافية وثقافة التحسين المستمر.'
                  : 'Supporting a digitally enabled society and tech-forward economy: AI-based dynamic pricing, predictive revenue management, and advanced digital marketing. Our altus Hospitality Knowledge & Performance platform replaces paper-based procedures with a governed digital system that embeds transparency and a culture of continuous improvement.',
              },
              {
                p: isRTL ? 'الركيزة الثالثة' : 'Pillar III',
                t: isRTL ? 'تمكين الكوادر السعودية' : 'Empowering Saudi Human Capital',
                d: isRTL
                  ? 'انسجاماً مع أهداف السعودة وتمكين الشباب، نقدّم تدريباً تنفيذياً، أطر كفاءة قيادية، وبرامج نقل معرفة تبني جيلاً من الكوادر السعودية القادرة على المنافسة عالمياً، يتم تسليمها الآن على نطاق واسع عبر الأكاديمية الرقمية ثنائية اللغة للمنصة.'
                  : 'In step with Saudization and youth-empowerment goals, our executive coaching, leadership-competency frameworks, and knowledge-transfer programmes build a globally competitive class of Saudi executives, now delivered at scale through the platform’s bilingual digital academy, learning paths, and certification.',
              },
              {
                p: isRTL ? 'الركيزة الرابعة' : 'Pillar IV',
                t: isRTL ? 'تمكين المنشآت الصغيرة والمتوسطة ورواد الأعمال الجريئين' : 'Enabling SMEs, Start-ups & Bold Entrepreneurs',
                d: isRTL
                  ? 'تُعطي رؤية 2030 أولوية لمساهمة المنشآت الصغيرة والمتوسطة في الناتج المحلي. نجلب معايير استشارية من الفئة الأولى، عادة ما تكون حكراً على الشركات الكبرى، إلى الشركات الناشئة السعودية، وسعّرنا منصتنا خصيصاً لتناسب الفنادق المستقلة والمنشآت الصغيرة والمتوسطة.'
                  : 'Vision 2030 prioritises SME contribution to GDP. We bring Tier-1 consulting standards, typically reserved for conglomerates, to Saudi start-ups and scale-ups, and we priced our platform deliberately for independent hotels and SME establishments, engineering resilience and growth from day one.',
              },
            ].map((pillar) => (
              <div key={pillar.p} className="p-8 sm:p-9 border border-white/10" style={{ backgroundColor: COLOR.charcoalDeep }}>
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3" style={{ ...neueHaas, color: COLOR.copper }}>{pillar.p}</div>
                <h4 className="text-lg sm:text-xl text-white font-medium mb-3" style={neueHaas}>{pillar.t}</h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed" style={{ ...inter, color: '#94A3B8' }}>{pillar.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 p-8 sm:p-10 text-center border" style={{ borderColor: `${COLOR.copper}40`, backgroundColor: `${COLOR.copper}0D` }}>
            <p className="text-sm sm:text-base leading-relaxed max-w-3xl mx-auto text-white" style={canela}>
              {isRTL
                ? 'ننظر إلى رؤية 2030 كمسؤولية وطنية مشتركة. من خلال العمل عند نقطة التقاء عمليات الضيافة الرفيعة وذكاء الأعمال المتقدم، والاستثمار في منتجات رقمية سعودية حصرية، نضمن أن شركاءنا في المملكة مؤهّلون تماماً لتشكيل مستقبل قطاعاتهم.'
                : 'We regard Vision 2030 as a shared national responsibility. Working at the meeting point of elite hospitality operations and advanced business intelligence, and investing in proprietary Saudi-focused digital products, we ensure our partners in the Kingdom are fully equipped to shape the future of their sectors.'}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 4E: MARKET OPPORTUNITY (CREAMY WHITE) ═══════════════ */}
      <section id="market" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.creamyWhite }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-12 items-start mb-14">
            <div className="lg:col-span-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...neueHaas, color: COLOR.copper }}>
                {isRTL ? '13 — مسار النمو السعودي' : '13 — The Saudi Growth Runway'}
              </div>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-normal leading-tight" style={{ ...neueHaas, color: COLOR.charcoal }}>
                {isRTL ? (
                  <>فرصة <span className="italic" style={{ ...canela, color: COLOR.emerald }}>السوق.</span></>
                ) : (
                  <>Market <span className="italic" style={{ ...canela, color: COLOR.emerald }}>Opportunity.</span></>
                )}
              </h2>
              <p className="text-sm sm:text-base leading-relaxed mt-5" style={{ ...inter, color: COLOR.slate }}>
                {isRTL
                  ? 'تنفّذ المملكة أطمح توسّع فندقي في العالم. الأرقام تحدد حجم الفرصة وعلاوة التنفيذ المنضبط لصالح المالك.'
                  : 'The Kingdom is executing the most ambitious hospitality build-out in the world. The numbers define both the scale of the opportunity and the premium on disciplined, owner-side execution.'}
              </p>
            </div>
            <div className="lg:col-span-2">
              <img src="/altus-leadership.png" alt="" className="w-full h-full object-cover rounded-sm border" style={{ maxHeight: '260px', borderColor: COLOR.sand }} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 pb-12 border-b" style={{ borderColor: COLOR.sand }}>
            {[
              { v: '122M', l: isRTL ? 'زيارة محلية ودولية 2025 (+5%)' : 'domestic & international visits in 2025 (+5% YoY)' },
              { v: 'SAR 300B', l: isRTL ? 'إجمالي الإنفاق السياحي 2025 (≈81 مليار دولار)' : 'total tourism spending in 2025 (≈ USD 81B)' },
              { v: '362K', l: isRTL ? 'مفتاح فندقي متوقع بحلول 2030 (من 167.5 ألف)' : 'projected hotel keys by 2030 (from ~167.5K)' },
              { v: '78%', l: isRTL ? 'من خط الأنابيب فاخر وراقٍ' : 'of pipeline in luxury, upscale & upper-upscale' },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ ...mono, color: COLOR.emerald }}>{s.v}</div>
                <div className="text-[11px] leading-snug font-medium mt-2" style={{ ...neueHaas, color: COLOR.slate }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Visitor trajectory bar chart */}
          <div className="mb-16">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ ...neueHaas, color: COLOR.charcoal }}>
              {isRTL ? 'مسار الزوّار نحو هدف 150 مليون (بالملايين)' : 'Visitor Trajectory Toward the 150M Target (Millions of Visits)'}
            </h3>
            <div className="flex items-end gap-3 sm:gap-6 h-48">
              {[
                { y: '2022', v: 94 },
                { y: '2023', v: 106 },
                { y: '2024', v: 116 },
                { y: '2025', v: 122 },
                { y: '2030', v: 150, target: true },
              ].map((bar) => (
                <div key={bar.y} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-xs font-bold" style={{ ...mono, color: bar.target ? COLOR.emerald : COLOR.charcoal }}>{bar.v}</div>
                  <div
                    className="w-full"
                    style={{
                      height: `${(bar.v / 150) * 140}px`,
                      backgroundColor: bar.target ? COLOR.emerald : COLOR.copper,
                      opacity: bar.target ? 1 : 0.85,
                    }}
                  />
                  <div className="text-xs font-medium" style={{ ...neueHaas, color: COLOR.slate }}>{bar.target ? (isRTL ? 'هدف 2030' : '2030 Target') : bar.y}</div>
              </div>
            ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-10">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...inter, color: '#1a1a1a' }}>
                {isRTL ? 'توسّع العرض الفندقي (بالآلاف)' : 'Hotel Supply Expansion (Thousands of Keys)'}
              </h3>
              <div className="space-y-3">
                {[
                  { l: isRTL ? 'المخزون الحالي (الربع الأول 2025)' : 'Existing stock (Q1 2025)', v: 168 },
                  { l: isRTL ? 'قيد الإنشاء / التخطيط' : 'Under construction / planning', v: 100 },
                  { l: isRTL ? 'الإجمالي المتوقع بحلول 2030' : 'Projected total by 2030', v: 362 },
                ].map((row) => (
                  <div key={row.l}>
                    <div className="flex justify-between text-[12px] mb-1" style={{ ...inter, color: '#1a1a1a' }}>
                      <span>{row.l}</span><span className="font-bold">{row.v}K</span>
                    </div>
                    <div className="h-2 bg-white border border-stone-300">
                      <div className="h-full" style={{ width: `${(row.v / 362) * 100}%`, backgroundColor: COLOR.emerald }} />
                    </div>
              </div>
            ))}
              </div>
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...inter, color: '#1a1a1a' }}>
                {isRTL ? 'محفزات الطلب' : 'Demand Catalysts'}
              </h3>
              <ul className="space-y-2.5">
                {[
                  isRTL ? '35.7 مليون معتمر (2024): طلب ديني قياسي' : '35.7M Umrah pilgrims (2024): record religious demand',
                  isRTL ? 'إكسبو 2030 الرياض • كأس العالم فيفا 2034 • دورة الألعاب الآسيوية الشتوية 2029' : 'Expo 2030 Riyadh • FIFA World Cup 2034 • Asian Winter Games 2029',
                  isRTL ? 'المشاريع العملاقة: نيوم، البحر الأحمر، الدرعية، العلا، القدية' : 'Giga-projects: NEOM, Red Sea, Diriyah, AlUla, Qiddiya',
                ].map((c) => (
                  <li key={c} className="text-[12.5px] flex items-start gap-2.5" style={{ ...inter, color: '#6b6b6b' }}>
                    <span className="mt-1.5 h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: COLOR.gold }} />
                    {c}
                  </li>
                ))}
              </ul>
              <p className="text-[10.5px] mt-6 italic" style={{ ...inter, color: '#9b9384' }}>
                {isRTL
                  ? 'المصادر: بيانات أولية من وزارة السياحة السعودية (يناير 2026)؛ نايت فرانك، مراجعة سوق الضيافة السعودي 2025؛ وزارة الحج والعمرة، 2024.'
                  : 'Sources: Saudi Ministry of Tourism preliminary data (Jan 2026); Knight Frank, Saudi Arabia Hospitality Market Review 2025; Ministry of Hajj & Umrah, 2024.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 4F: ILLUSTRATIVE CASE STUDIES (CREAMY WHITE) ═══════════════ */}
      <section id="case-studies" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.creamyWhite }}>
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="max-w-2xl mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...neueHaas, color: COLOR.copper }}>
              {isRTL ? '14–15 — إثبات المفهوم' : '14–15 — Proof of Concept'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-normal leading-tight" style={{ ...neueHaas, color: COLOR.charcoal }}>
              {isRTL ? (
                <>دراسات حالة <span className="italic" style={{ ...canela, color: COLOR.emerald }}>توضيحية.</span></>
              ) : (
                <>Illustrative <span className="italic" style={{ ...canela, color: COLOR.emerald }}>case studies.</span></>
              )}
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mt-5" style={{ ...inter, color: COLOR.slate }}>
              {isRTL
                ? 'تكليفات مركّبة، مجهّلة، وموسومة بوضوح كتوضيحية. كل منها يعكس مهام قادها شركاؤنا شخصياً داخل علامات عالمية ومحافظ مستقلة.'
                : 'Composite engagements, anonymised and clearly labelled as illustrative. Each reflects mandates our principals have personally led inside global brands and independent portfolios.'}
            </p>
          </FadeInSection>

          <StaggerChildren className="grid md:grid-cols-2 gap-6">
            {[
              {
                tag: isRTL ? 'منتجع رئيسي • مصر • تحويل الأداء' : 'Flagship Resort • Egypt • Turnaround',
                title: isRTL ? 'تحويل منتجع رئيسي وريادة سوقية مستدامة' : 'Flagship Resort Turnaround & Sustained Market Leadership',
                challenge: isRTL
                  ? 'منتجع شاطئي بعلامة تجارية يضم أكثر من 300 غرفة في سوق ترفيهي شديد التنافس، يقصّر عن مجموعته المقارنة في السعر ومشاعر النزلاء.'
                  : 'A 300+ key branded beachfront resort in a fiercely competitive leisure market, underperforming its comp set on rate and guest sentiment.',
                stats: [
                  { v: '+25%', l: isRTL ? 'نمو RevPAR' : 'RevPAR growth' },
                  { v: '+30%', l: isRTL ? 'رضا النزلاء' : 'guest satisfaction' },
                  { v: '#1', l: isRTL ? '6 سنوات متتالية' : '6 straight years' },
                  { v: '$340K', l: isRTL ? 'توفير سنوي' : 'annual savings' },
                ],
              },
              {
                tag: isRTL ? 'محفظة متعددة • 19 فندقاً • تميّز تشغيلي' : 'Multi-Property • 19 Hotels • Operational Excellence',
                title: isRTL ? 'مهمة تميّز تشغيلي على مستوى المحفظة' : 'Portfolio-Wide Operational Excellence Mandate',
                challenge: isRTL
                  ? 'محفظة قطرية لمشغّل عالمي تضم 19 فندقاً وأكثر من 3000 غرفة تمتد عبر أصول مدينية ومنتجعية ومطارية.'
                  : 'A global operator’s country portfolio of 19 hotels and 3,000+ rooms spanning city, resort, and airport assets.',
                stats: [
                  { v: '19', l: isRTL ? 'فندقاً تحت مهمة واحدة' : 'hotels under one mandate' },
                  { v: '3,000+', l: isRTL ? 'غرفة ضمن النطاق' : 'rooms in scope' },
                  { v: '+10%', l: isRTL ? 'رضا النزلاء' : 'guest satisfaction' },
                  { v: '+8%', l: isRTL ? 'إيراد الأطعمة والمشروبات' : 'F&B revenue in 18 months' },
                ],
              },
              {
                tag: isRTL ? 'ما قبل الافتتاح • السعودية • إطلاق مزدوج' : 'Pre-Opening • KSA • Dual Launch',
                title: isRTL ? 'افتتاح متزامن لفندقين وتسريع الأداء' : 'Simultaneous Dual-Hotel Pre-Opening & Ramp-Up',
                challenge: isRTL
                  ? 'مجموعة ضيافة إقليمية تكلّف بمنشأتين جديدتين في المملكة بموسم افتتاح واحد، دون أي هامش لتأخير الإطلاق.'
                  : 'A regional hospitality group commissioning two new-build properties in the Kingdom with a single opening season, zero tolerance for launch slippage.',
                stats: [
                  { v: '2', l: isRTL ? 'فندقان افتتحا معاً' : 'hotels opened simultaneously' },
                  { v: '90–95%', l: isRTL ? 'جاهزية تشغيلية عند الإطلاق' : 'operational readiness at launch' },
                  { v: '#1', l: isRTL ? 'أرباح غرفة في المنطقة' : 'GOP in the region post-ramp' },
                  { v: 'T-0', l: isRTL ? 'افتتاح في الموعد دون تأخير' : 'on-time opening, no slippage' },
                ],
              },
              {
                tag: isRTL ? 'تمثيل المالك • الرياض • 4 أصول بعلامات' : 'Owner Representation • Riyadh • 4 Branded Assets',
                title: isRTL ? 'ممثل مالك لمحفظة رياضية بعلامات عالمية' : 'Owner’s Representative for a Branded Riyadh Portfolio',
                challenge: isRTL
                  ? 'مالك مؤسسي يطوّر أربعة فنادق بعلامات عالمية ضمن حي مالي وتقني رائد في الرياض.'
                  : 'An institutional owner developing four internationally branded hotels within a flagship Riyadh financial and technology district.',
                stats: [
                  { v: '4', l: isRTL ? 'أصول بعلامات تحت الإشراف' : 'branded assets overseen' },
                  { v: 'HMA', l: isRTL ? 'حوكمة اتفاقية إدارة كاملة' : 'full agreement governance' },
                  { v: 'OS&E', l: isRTL ? 'مراجعة وضبط المشتريات' : 'procurement review & control' },
                  { v: '100%', l: isRTL ? 'تسليم بقبول المشغّل' : 'handovers to operator acceptance' },
                ],
              },
            ].map((cs) => (
              <div key={cs.title} className="p-8 sm:p-9 border hover:shadow-md transition-shadow duration-300" style={{ backgroundColor: COLOR.ivory, borderColor: COLOR.sand }}>
                <div className="text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{ ...neueHaas, color: COLOR.emerald }}>{cs.tag}</div>
                <h4 className="text-lg sm:text-xl font-medium mb-3" style={{ ...neueHaas, color: COLOR.charcoal }}>{cs.title}</h4>
                <p className="text-sm leading-relaxed mb-6" style={{ ...inter, color: COLOR.slate }}>{cs.challenge}</p>
                <div className="grid grid-cols-4 gap-2 pt-5 border-t" style={{ borderColor: COLOR.sand }}>
                  {cs.stats.map((s) => (
                    <div key={s.l}>
                      <div className="text-base sm:text-lg font-semibold" style={{ ...mono, color: COLOR.copper }}>{s.v}</div>
                      <div className="text-[10px] uppercase tracking-wide leading-tight font-medium mt-1" style={{ ...neueHaas, color: COLOR.slate }}>{s.l}</div>
              </div>
            ))}
                </div>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ═══════════════ SECTION 5: LEADERSHIP (CHARCOAL) ═══════════════ */}
      <section id="leadership" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.charcoal }}>
        <FadeInSection className="max-w-5xl mx-auto text-center space-y-4 mb-14">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ ...neueHaas, color: COLOR.copper }}>
            {isRTL ? '16–17 — القيادة التنفيذية' : '16–17 — Executive Leadership'}
          </div>
          <h2
            className="text-3xl sm:text-5xl md:text-6xl text-white font-normal"
            style={neueHaas}
          >
            Named. <span className="italic" style={{ ...canela, color: COLOR.copper }}>Present.</span> Accountable.
          </h2>
        </FadeInSection>

        <StaggerChildren className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 text-start">
            {/* Islam Mahrous */}
            <motion.div variants={staggerItem} className="p-8 sm:p-10 border border-white/10 space-y-6" style={{ backgroundColor: COLOR.charcoalDeep }}>
              <div className="flex items-center gap-5">
                <img
                  src="/founder-islam.jpg"
                  alt="Islam Mahrous"
                  className="w-20 h-20 rounded-full object-cover object-top border-2"
                  style={{ borderColor: COLOR.copper }}
                />
                <div>
                  <h3 className="text-xl text-white font-medium" style={canela}>Islam Mahrous</h3>
                  <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ ...neueHaas, color: COLOR.copper }}>
                    {isRTL ? 'مؤسس مشارك: العلامة، الاستراتيجية التجارية، والتحول الرقمي' : 'Co-Founder: Brand, Commercial Strategy & AI-Driven Digital Transformation'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed" style={{ ...inter, color: '#94A3B8' }}>
                {isRTL
                  ? 'إسلام هو مبتكر النمو في الشركة وحافتها التقنية المستقبلية: الجسر الحيوي بين نماذج الأعمال التقليدية ومتطلبات العصر الحديث. عبر ثلاثة عقود من القيادة متعددة العلامات مع ماريوت وIHG وستارووود وأكور، وإدارة أصول مستقلة عبر السعودية والخليج ومصر وشمال أفريقيا، أثبت للمستثمرين ورواد الأعمال أن التحديث الرقمي ووضوح العلامة محركان مباشران وقابلان للقياس لقيمة المؤسسة. وهو المهندس المنتِج لمنصة altus HK&P.'
                  : 'Islam is the firm’s growth innovator and its forward-looking technological edge: the vital bridge between traditional business models and the demands of the modern era. Across three decades of multi-brand leadership with Marriott, IHG, Starwood, and Accor, and independent asset management across Saudi Arabia, the GCC, Egypt, and North Africa, he has proven that digital modernisation and brand clarity are direct, measurable drivers of enterprise valuation. He is the product architect of the altus Hospitality Knowledge & Performance platform.'}
              </p>

              <div className="pt-5 border-t space-y-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <h5 className="text-xs font-bold uppercase tracking-[0.15em] mb-1" style={{ ...neueHaas, color: COLOR.copper }}>{isRTL ? 'السجل المهني' : 'Track Record'}</h5>
                {(isRTL
                  ? [
                      '30+ عاماً من القيادة الفندقية متعددة العلامات عبر الخليج ومصر وشمال أفريقيا: أنظمة ماريوت وIHG وستارووود وأكور.',
                      'قاد منتجعاً رئيسياً بعلامة تجارية إلى المركز الأول في مجموعة ماريوت المقارنة بمصر لست سنوات متتالية: +25% RevPAR و+30% رضا نزلاء مع توسّع مستدام في هامش الأرباح.',
                      'كُلّف من ماريوت العالمية بقيادة التميّز التشغيلي عبر 19 فندقاً في مصر (+3000 غرفة)، رافعاً رضا النزلاء 10% وإيراد الأطعمة والمشروبات 8% خلال 18 شهراً.',
                      'أدار خمسة مشاريع ما قبل الافتتاح عبر السعودية وليبيا ومصر وغرب أفريقيا: أكثر من 1700 غرفة بجاهزية تشغيلية 90–95%.',
                      'حزام أسود Six Sigma: أربعة مشاريع DMAIC معتمدة، منها إعادة تصميم رحلة النزيل بتوفير 340 ألف دولار سنوياً.',
                      'أشرف على محفظة تجديد رأسمالي تفوق 10 ملايين دولار، محققاً توفيراً بنسبة 7–20% دون أي إخلال بتجربة النزيل.',
                    ]
                  : [
                      '30+ years of multi-brand hospitality leadership across the GCC, Egypt, and North Africa: Marriott, IHG, Starwood, and Accor systems.',
                      'Led a flagship branded resort to No. 1 in Marriott’s Egypt competitive set for six consecutive years: +25% RevPAR and +30% guest satisfaction with sustained GOP margin expansion.',
                      'Mandated by Marriott International to lead operational excellence across 19 hotels in Egypt (3,000+ rooms), lifting guest satisfaction 10% and F&B revenue 8% within 18 months.',
                      'Directed five pre-opening projects across Saudi Arabia, Libya, Egypt, and West Africa: 1,700+ rooms delivered at 90–95% operational readiness.',
                      'Six Sigma Black Belt: four certified DMAIC projects, including a guest-journey redesign saving USD 340K annually.',
                      'Oversaw a USD 10M+ capital renovation portfolio, delivering 7–20% cost savings with zero guest-experience disruption.',
                    ]
                ).map((tr) => (
                  <p key={tr} className="text-xs sm:text-sm text-slate-300 flex items-start gap-2.5 leading-relaxed" style={inter}>
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: COLOR.copper }} />
                    {tr}
                  </p>
                ))}
              </div>

              <div className="pt-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <h5 className="text-xs font-bold uppercase tracking-[0.15em] mb-2" style={{ ...neueHaas, color: COLOR.copper }}>{isRTL ? 'التقدير' : 'Recognition'}</h5>
                <p className="text-xs text-slate-300" style={inter}>
                  {isRTL
                    ? 'جائزة المدير العام من ماريوت للتميّز في خدمة العملاء، الشرق الأوسط وأفريقيا، 2017 و2022 • أفضل مدير ابتكار تشغيلي من ستارووود، 2007'
                    : 'Marriott GM Award for Customer Service Excellence, MEA, 2017 & 2022 • Starwood Best Operational Innovation Manager, 2007'}
                </p>
              </div>
            </motion.div>

            {/* Hossam Smadi */}
            <div className="p-8 sm:p-10 border border-white/10 space-y-6" style={{ backgroundColor: COLOR.charcoalDeep }}>
              <div className="flex items-center gap-5">
                <img
                  src="/founder-hossam.png"
                  alt="Hossam Smadi"
                  className="w-20 h-20 rounded-full object-cover object-top border-2"
                  style={{ borderColor: COLOR.copper }}
                />
                <div>
                  <h3 className="text-xl text-white font-medium" style={canela}>Hossam Smadi</h3>
                  <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ ...neueHaas, color: COLOR.copper }}>
                    {isRTL ? 'مؤسس مشارك: عمليات الضيافة وإدارة الأصول' : 'Co-Founder: Hospitality Operations & Asset Management'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed" style={{ ...inter, color: '#94A3B8' }}>
                {isRTL
                  ? 'حسام هو المهندس التشغيلي للشركة. بخبرة عميقة في تعقيدات تشغيل الضيافة الدولية، يركّز على تحويل الأصول المادية إلى مؤسسات عالية العائد وخالية من العيوب التشغيلية. عبر أكثر من 30 عاماً من القيادة التنفيذية في عمليات الفنادق وإدارة الأصول في السعودية والأردن، عبر علامات عالمية ومجموعات مستقلة، يضمن تنفيذ الاستراتيجية الرفيعة بلا تهاون على أرض الواقع مع التزام صارم بمعايير الجودة.'
                  : 'Hossam is the firm’s operational architect. With deep expertise in the operating complexities of international hospitality, his focus is converting physical assets into high-yield, operationally flawless institutions. Across 30+ years of executive leadership in hotel operations and asset management throughout Saudi Arabia and Jordan, spanning global brands and independent groups, he ensures that high-level strategy is executed impeccably on the ground, with uncompromising adherence to quality standards.'}
              </p>

              <div className="pt-5 border-t space-y-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <h5 className="text-xs font-bold uppercase tracking-[0.15em] mb-1" style={{ ...neueHaas, color: COLOR.copper }}>{isRTL ? 'السجل المهني' : 'Track Record'}</h5>
                {(isRTL
                  ? [
                      '30+ عاماً من القيادة التنفيذية في عمليات الفنادق وإدارة الأصول عبر السعودية والأردن: علامات عالمية ومجموعات مستقلة.',
                      'كمدير عام، قاد منشأة من ما قبل الافتتاح إلى التشغيل الكامل وحتى لقب أفضل فندق اقتصادي في السعودية.',
                      'حقّق أعلى أرباح غرفة في منطقة جازان أثناء قيادته لفنادق Swiss Blue، عبر انضباط تجاري وحوكمة تكلفة صارمة.',
                      'أدار بنجاح افتتاحين متزامنين لفندقين في 2018، ونقل كليهما إلى التشغيل الكامل وتوليد الإيرادات.',
                      'ممثل مالك لأربعة أصول بعلامات عالمية في الرياض: كراون بلازا المدينة الرقمية، إنتركونتيننتال، هوتيل إنديجو، وويندام جراند في KAFD.',
                      'أشرف مباشرة على اتفاقيات إدارة الفنادق (HMA)، مراجعات المشتريات والتجهيزات، وعمليات تسليم المبنى للمشغّل.',
                    ]
                  : [
                      '30+ years of executive leadership in hotel operations and asset management across Saudi Arabia and Jordan: global brands and independent groups.',
                      'As General Manager, led a property from pre-opening to full operation and to the title of Best Economy Hotel in Saudi Arabia.',
                      'Delivered the highest GOP in the Jazan region while leading Swiss Blue Hotels properties, through commercial discipline and strict cost governance.',
                      'Successfully directed two simultaneous hotel openings in 2018, carrying both to full operation and revenue generation.',
                      'Owner’s Representative for four internationally branded Riyadh assets: Crowne Plaza Digital City, InterContinental, Hotel Indigo, and Wyndham Grand at KAFD.',
                      'Directly governed Hotel Management Agreements (HMA), procurement and OS&E reviews, and operator building-handover processes.',
                    ]
                ).map((tr) => (
                  <p key={tr} className="text-xs sm:text-sm text-slate-300 flex items-start gap-2.5 leading-relaxed" style={inter}>
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: COLOR.copper }} />
                    {tr}
                  </p>
                ))}
              </div>

              <div className="pt-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <h5 className="text-xs font-bold uppercase tracking-[0.15em] mb-2" style={{ ...neueHaas, color: COLOR.copper }}>{isRTL ? 'التقدير' : 'Recognition'}</h5>
                <p className="text-xs text-slate-300" style={inter}>
                  {isRTL
                    ? 'أفضل فندق اقتصادي في السعودية، كمدير عام • تقدير سفارة الولايات المتحدة في الرياض: أفضل إجراءات أمنية'
                    : 'Best Economy Hotel in Saudi Arabia, as General Manager • U.S. Embassy Riyadh recognition: Best Security Measures'}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => setBriefingOpen(true)}
              className="text-[11px] font-semibold tracking-[0.15em] uppercase flex items-center gap-2 mx-auto transition-colors duration-300 hover:opacity-80"
              style={{ ...neueHaas, color: COLOR.copper }}
            >
              <span>{isRTL ? 'تعرف على الشركاء' : 'MEET THE FIRM'}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>
        </StaggerChildren>
      </section>

      {/* ═══════════════ SECTION 5B: STRATEGIC PARTNERSHIPS (CREAMY WHITE) ═══════════════ */}
      <section id="partnerships" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.creamyWhite }}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...neueHaas, color: COLOR.copper }}>
              {isRTL ? '18 — المنظومة والتحالفات' : '18 — Ecosystem & Alliances'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-normal leading-tight" style={{ ...neueHaas, color: COLOR.charcoal }}>
              {isRTL ? (
                <>شراكات <span className="italic" style={{ ...canela, color: COLOR.emerald }}>استراتيجية.</span></>
              ) : (
                <>Strategic <span className="italic" style={{ ...canela, color: COLOR.emerald }}>partnerships.</span></>
              )}
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mt-5" style={{ ...inter, color: COLOR.slate }}>
              {isRTL
                ? 'تعمل ألتوس كمركز لمنظومة منتقاة بعناية: تُوائم بين المشغّلين، رأس المال، التقنية، والجهات الحكومية بحيث تستفيد كل مهمة من شركاء تنفيذ من الفئة الأولى.'
                : 'Altus operates as the hub of a deliberately curated ecosystem: aligning operators, capital, technology, and government so that every mandate draws on best-in-class execution partners.'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                t: isRTL ? 'المشغّلون الفندقيون والعلامات العالمية' : 'Hotel Operators & Global Brands',
                d: isRTL ? 'علاقات عمل عبر أنظمة تشغيل دولية: تمكّن من تفاوض مستنير على اتفاقيات الإدارة، اختيار العلامة، وحوكمة أداء المشغّل لصالح المالك.' : 'Working relationships across international operating systems: enabling informed HMA negotiation, brand selection, and operator performance governance on the owner’s behalf.',
              },
              {
                t: isRTL ? 'المستثمرون العالميون والصناديق والمكاتب العائلية' : 'Global Investors, Funds & Family Offices',
                d: isRTL ? 'مواءمة استشارية مع المستثمرين المؤسسيين والمطورين والمكاتب العائلية: التحقق من الجدوى، دعم الاكتتاب، وإشراف أداء الأصل طوال فترة الاحتفاظ.' : 'Advisory alignment with institutional investors, developers, and family offices: feasibility validation, underwriting support, and asset-performance stewardship across the hold period.',
              },
              {
                t: isRTL ? 'شركاء التقنية والبيانات' : 'Technology & Data Partners',
                d: isRTL ? 'شبكة مُدقَّقة من مزودي أنظمة إدارة الممتلكات وإدارة الإيرادات وذكاء الأعمال والذكاء الاصطناعي: يتم اختيارهم لكل مهمة على أساس الجدارة، لا العمولة، حفاظاً على استقلالية الاستشارة الكاملة.' : 'A vetted bench of PMS, revenue-management, BI, and AI solution providers: selected per mandate on merit, never on commission, preserving full advisory independence.',
              },
              {
                t: isRTL ? 'الحكومة وهيئات التطوير' : 'Government & Development Authorities',
                d: isRTL ? 'تعامل بنّاء مع الوزارات وهيئات الوجهات وكيانات المشاريع العملاقة: مواءمة استراتيجية الأصول الخاصة مع أولويات السياحة الوطنية ورؤية 2030.' : 'Constructive engagement with ministries, destination authorities, and giga-project entities: aligning private asset strategy with national tourism and Vision 2030 priorities.',
              },
            ].map((p) => (
              <div key={p.t} className="p-8 border" style={{ backgroundColor: COLOR.ivory, borderColor: COLOR.sand }}>
                <h4 className="text-base font-bold mb-2.5" style={{ ...neueHaas, color: COLOR.charcoal }}>{p.t}</h4>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ ...inter, color: COLOR.slate }}>{p.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-8 sm:p-10 text-center" style={{ backgroundColor: COLOR.charcoalDeep }}>
            <h5 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3" style={{ ...neueHaas, color: COLOR.copper }}>
              {isRTL ? 'مبدأ الاستقلالية' : 'The Independence Principle'}
            </h5>
            <p className="text-sm sm:text-base leading-relaxed max-w-2xl mx-auto text-white" style={canela}>
              {isRTL
                ? 'لا نملك حصصاً في المشغّلين، ولا نتقاضى عمولات من الموردين، ولا نحمل ولاءً لأي علامة. شراكاتنا تخدم مصلحة واحدة فقط: مصلحة العميل. هذا الاستقلال هو أساس كل توصية نقدّمها.'
                : 'We hold no equity in operators, take no vendor commissions, and carry no brand allegiance. Our partnerships exist to serve one interest only: the client’s. That independence is the foundation of every recommendation we make.'}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 5C: OUR VALUES (CHARCOAL) ═══════════════ */}
      <section id="values" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.charcoal }}>
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="max-w-2xl mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...neueHaas, color: COLOR.copper }}>
              {isRTL ? '19 — ما نؤمن به' : '19 — What We Stand For'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl text-white font-normal leading-tight" style={neueHaas}>
              {isRTL ? (
                <>قيمنا <span className="italic" style={{ ...canela, color: COLOR.copper }}>الأساسية.</span></>
              ) : (
                <>Our <span className="italic" style={{ ...canela, color: COLOR.copper }}>values.</span></>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mt-5" style={{ ...inter, color: '#94A3B8' }}>
              {isRTL
                ? 'سبعة التزامات تحكم كيف ننصح، وكيف ننفّذ، وكيف نتصرّف حين لا يراقبنا أحد.'
                : 'Seven commitments that govern how we advise, how we execute, and how we behave when no one is watching.'}
            </p>
          </FadeInSection>

          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            {[
              {
                t: isRTL ? 'النزاهة' : 'Integrity',
                d: isRTL ? 'نتصرف كأمناء حقيقيين على أصول العميل: تشخيص واقعي، تقارير عائد شفافة، ونصيحة تخدم مصلحتك حتى لو كلّفتنا التكليف نفسه.' : 'We act as true fiduciaries of client assets: realistic diagnostics, transparent ROI reporting, and advice that serves your interest even when it costs us the engagement.',
              },
              {
                t: isRTL ? 'التميّز' : 'Excellence',
                d: isRTL ? 'معايير لا تقبل التنازل: رفض للتوسط عبر اهتمام دقيق بتفاصيل التنفيذ ومعايير عالمية فائقة.' : 'Uncompromising standards: a refusal of mediocrity through obsessive attention to execution detail and superior global benchmarks.',
              },
              {
                t: isRTL ? 'الابتكار' : 'Innovation',
                d: isRTL ? 'سعي حثيث نحو الاضطراب الرقمي: البحث والاختبار والدمج المستمر لقدرات جديدة كميزة تنافسية.' : 'Agile pursuit of digital disruption: actively seeking, testing, and integrating new capability as competitive advantage.',
              },
              {
                t: isRTL ? 'الضيافة' : 'Hospitality',
                d: isRTL ? 'الخدمة هي لغتنا الأم. تجربة النزيل، وعائد المالك عليها، في صميم كل قرار.' : 'Service is our native language. The guest’s experience, and the owner’s return on it, sit at the centre of every decision.',
              },
              {
                t: isRTL ? 'الأداء' : 'Performance',
                d: isRTL ? 'دقة قائمة على البيانات: يستبدل الحدس عمداً بالتحليلات التجريبية والذكاء الاصطناعي والنمذجة المالية. أثر يُقاس، لا يُدّعى.' : 'Data-driven precision: intuition deliberately replaced by empirical analytics, AI, and financial modelling. Impact that is measured, not asserted.',
              },
              {
                t: isRTL ? 'الثقة' : 'Trust',
                d: isRTL ? 'تُكتسب عبر الصراحة والسرية والاتساق: عملة كل علاقة مجلس إدارة نحملها.' : 'Earned through candour, confidentiality, and consistency: the currency of every boardroom relationship we hold.',
              },
              {
                t: isRTL ? 'التعاون' : 'Collaboration',
                d: isRTL ? 'تمكين محوره الإنسان: نبني جنباً إلى جنب مع فرق العميل والكفاءات المحلية، وننقل القدرات بدلاً من خلق الاعتماد.' : 'Human-centred empowerment: we build alongside client teams and local talent, transferring capability rather than creating dependency.',
              },
            ].map((v) => (
              <div key={v.t} className="p-7 hover:bg-white/[0.03] transition-colors duration-300" style={{ backgroundColor: COLOR.charcoalDeep }}>
                <h4 className="text-sm font-bold uppercase tracking-wide mb-2.5" style={{ ...neueHaas, color: COLOR.copper }}>{v.t}</h4>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-300" style={{ ...inter, color: '#94A3B8' }}>{v.d}</p>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ═══════════════ SECTION 5D: ESG & SUSTAINABILITY (CREAMY WHITE, TEXTURED) ═══════════════ */}
      <section id="esg" className="py-24 sm:py-32 px-4 relative overflow-hidden" style={{ backgroundColor: COLOR.creamyWhite }}>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "url('/bg-pattern-dark.png')", backgroundSize: '280px' }} />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="max-w-2xl mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...neueHaas, color: COLOR.emerald }}>
              {isRTL ? '20 — أداء مسؤول' : '20 — Responsible Performance'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-normal leading-tight" style={{ ...neueHaas, color: COLOR.charcoal }}>
              ESG &amp; <span className="italic" style={{ ...canela, color: COLOR.emerald }}>{isRTL ? 'الاستدامة' : 'Sustainability'}</span>
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mt-5" style={{ ...inter, color: COLOR.slate }}>
              {isRTL
                ? 'الأداء المستدام ليس تمريناً امتثالياً، بل استراتيجية قيمة للأصل. نُرسّخ الانضباط البيئي والاجتماعي والحوكمي داخل النموذج التشغيلي نفسه.'
                : 'Sustainable performance is not a compliance exercise. It is an asset-value strategy. We embed environmental, social, and governance discipline into the operating model itself.'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                t: isRTL ? 'الحوكمة' : 'Governance',
                d: isRTL ? 'تقارير شفافة للمالك، نزاهة اتفاقيات الإدارة والمشتريات، ضوابط منع التسرب، وأطر ضمان على مستوى مجلس الإدارة: بنية الحوكمة التي تحمي رأس المال والسمعة معاً.' : 'Transparent owner reporting, HMA and procurement integrity, anti-leakage controls, and board-grade assurance frameworks: the governance architecture that protects capital and reputation alike.',
              },
              {
                t: isRTL ? 'السياحة المسؤولة' : 'Responsible Tourism',
                d: isRTL ? 'رعاية الوجهات بما يتوافق مع أجندة السياحة التجديدية لرؤية 2030: إدارة أثر الزوار، حماية التراث، وتجارب نزيل مصممة لتُعطي أكثر مما تأخذ.' : 'Destination stewardship aligned with Vision 2030’s regenerative tourism agenda: visitor-impact management, heritage protection, and guest experiences designed to give back more than they take.',
              },
              {
                t: isRTL ? 'المجتمع والأفراد' : 'Community & People',
                d: isRTL ? 'استراتيجيات كوادر تُركّز على السعودة، تطوير الموردين المحليين، بيئات عمل عادلة وكريمة، ونقل معرفي منظم يترك المجتمعات أقوى مما وجدناها.' : 'Saudization-first talent strategies, local supplier development, fair and dignified workplaces, and structured knowledge transfer that leaves communities stronger than we found them.',
              },
              {
                t: isRTL ? 'الاستدامة التشغيلية' : 'Operational Sustainability',
                d: isRTL ? 'كفاءة الطاقة والمياه والنفايات مُهندسة داخل إجراءات التشغيل وخطط الإنفاق الرأسمالي: ذكاء مرافق وتكلفة دورة حياة تقلّل البصمة وتوسّع أرباح الغرفة.' : 'Energy, water, and waste efficiency engineered into SOPs and capex plans: utilities intelligence and lifecycle costing that reduce footprint while expanding GOP.',
              },
            ].map((e) => (
              <div key={e.t} className="p-8 border" style={{ backgroundColor: COLOR.ivory, borderColor: COLOR.sand }}>
                <h4 className="text-base font-bold mb-2.5" style={{ ...neueHaas, color: COLOR.charcoal }}>{e.t}</h4>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ ...inter, color: COLOR.slate }}>{e.d}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-sm italic mt-10" style={{ ...canela, color: COLOR.charcoal }}>
            {isRTL
              ? 'الأصول التي تحترم وجهتها تتفوق على تلك التي تكتفي باحتلالها.'
              : 'Assets that respect their destination outperform those that merely occupy it.'}
          </p>
        </div>
      </section>

      {/* ═══════════════ SECTION 5E: DIGITAL & AI (CHARCOAL) ═══════════════ */}
      <section id="digital-ai" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.charcoal }}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...neueHaas, color: COLOR.copper }}>
              {isRTL ? '21 — طبقة الذكاء' : '21 — The Intelligence Layer'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl text-white font-normal leading-tight" style={neueHaas}>
              {isRTL ? (
                <>الرقمنة <span className="italic" style={{ ...canela, color: COLOR.copper }}>والذكاء الاصطناعي.</span></>
              ) : (
                <>Digital <span className="italic" style={{ ...canela, color: COLOR.copper }}>&amp; AI.</span></>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mt-5" style={{ ...inter, color: '#94A3B8' }}>
              {isRTL
                ? 'كل تكليف من ألتوس يأتي مزوّداً بطبقة ذكاء: الأدوات التي تحوّل العمليات إلى أدلة، والأدلة إلى ميزة تنافسية.'
                : 'Every Altus mandate ships with an intelligence layer: the instrumentation that turns operations into evidence, and evidence into advantage.'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            {[
              {
                t: isRTL ? 'ذكاء الأعمال' : 'Business Intelligence',
                d: isRTL ? 'مصدر موحّد للحقيقة عبر بيانات PMS وPOS والقنوات والبيانات المالية: منقّحة وجاهزة للقرار.' : 'A single source of truth across PMS, POS, channel, and financial data: unified, cleansed, and decision-ready.',
              },
              {
                t: isRTL ? 'لوحات تنفيذية' : 'Executive Dashboards',
                d: isRTL ? 'لوحات بمستوى المالك ومجلس الإدارة: RevPAR، GOPPAR، الحجوزات القادمة، المشاعر، وإنتاجية الرواتب في عرض حي واحد.' : 'Owner- and board-grade dashboards: RevPAR, GOPPAR, pickup, sentiment, and payroll productivity in one live view.',
              },
              {
                t: isRTL ? 'ذكاء اصطناعي تطبيقي' : 'Applied AI',
                d: isRTL ? 'مصفوفات تسعير ديناميكي، إدارة عائد تنبؤية، توقّع الطلب، وخرائط طريق للجاهزية للذكاء الاصطناعي تُنشر على مراحل.' : 'Dynamic pricing matrices, predictive yield management, demand forecasting, and AI-readiness roadmaps deployed in phases.',
              },
              {
                t: isRTL ? 'تحليلات متقدمة' : 'Advanced Analytics',
                d: isRTL ? 'اقتصاديات القنوات، تحليل مشاعر النزلاء، تحليل محركات التكلفة، ونمذجة سيناريوهات القرارات الرأسمالية.' : 'Channel economics, guest-sentiment mining, cost-driver analysis, and scenario modelling for capital decisions.',
              },
              {
                t: isRTL ? 'مراقبة الأداء' : 'Performance Monitoring',
                d: isRTL ? 'قياس مستمر لمؤشرات الأداء مع التنبيه: تظهر الانحرافات خلال أيام، لا في تشريح نهاية الشهر.' : 'Continuous KPI instrumentation with alerting: variances surfaced in days, not at month-end post-mortems.',
              },
              {
                t: isRTL ? 'التحول الرقمي' : 'Digital Transformation',
                d: isRTL ? 'بنية CRM، الانتقال إلى السحابة، ومخططات تقنية متكاملة تخفض تكاليف تقنية المعلومات على المدى الطويل.' : 'CRM architecture, cloud migration, and integrated technology blueprints that cut long-run IT overheads.',
              },
            ].map((d) => (
              <div key={d.t} className="p-7 hover:bg-white/[0.03] transition-colors duration-300" style={{ backgroundColor: COLOR.charcoalDeep }}>
                <h4 className="text-sm font-bold uppercase tracking-wide mb-2.5" style={{ ...neueHaas, color: COLOR.copper }}>{d.t}</h4>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-300" style={{ ...inter, color: '#94A3B8' }}>{d.d}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs sm:text-sm text-slate-400 mt-10 max-w-2xl mx-auto" style={inter}>
            {isRTL
              ? 'من الحدس إلى الحقيقة الميدانية. نستبدل الحدس بالتحليلات التجريبية: عمداً، وفي كل مكان.'
              : 'From gut feel to ground truth. We replace intuition with empirical analytics: deliberately, and everywhere.'}
          </p>
        </div>
      </section>

      {/* ═══════════════ SECTION 5F: WHY CLIENTS CHOOSE ALTUS (CREAMY WHITE) ═══════════════ */}
      <section id="why-clients" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.creamyWhite }}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...neueHaas, color: COLOR.copper }}>
              {isRTL ? '22 — القرار في صفحة واحدة' : '22 — The Decision in One Page'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-normal leading-tight" style={{ ...neueHaas, color: COLOR.charcoal }}>
              {isRTL ? (
                <>لماذا يختار العملاء <span className="italic" style={{ ...canela, color: COLOR.emerald }}>ألتوس.</span></>
              ) : (
                <>Why clients choose <span className="italic" style={{ ...canela, color: COLOR.emerald }}>Altus.</span></>
              )}
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mt-5" style={{ ...inter, color: COLOR.slate }}>
              {isRTL
                ? 'مقارنة صريحة ومقصودة: العملاء يستحقون معرفة ما يشترونه بالضبط.'
                : 'A candid comparison: how the Altus model differs from conventional consulting engagements, dimension by dimension.'}
            </p>
          </div>

          <div className="overflow-x-auto border" style={{ borderColor: COLOR.sand }}>
            <table className="w-full text-start" style={inter}>
              <thead>
                <tr className="border-b" style={{ backgroundColor: COLOR.ivory, borderColor: COLOR.sand }}>
                  <th className="p-4 text-xs uppercase tracking-wider font-bold text-start" style={{ ...neueHaas, color: COLOR.charcoal }}>{isRTL ? 'البُعد' : 'Dimension'}</th>
                  <th className="p-4 text-xs uppercase tracking-wider font-bold text-start" style={{ ...neueHaas, color: COLOR.slate }}>{isRTL ? 'الاستشارات التقليدية' : 'Traditional Consulting'}</th>
                  <th className="p-4 text-xs uppercase tracking-wider font-bold text-start" style={{ ...neueHaas, color: COLOR.emerald }}>{isRTL ? 'ألتوس استشارات' : 'Altus Advisory'}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    d: isRTL ? 'المنظور' : 'Perspective',
                    a: isRTL ? 'وجهات نظر متأثرة بالمشغّل أو المورّد' : 'Operator- or vendor-influenced viewpoints',
                    c: isRTL ? 'حصرياً في صف المالك، استئمانية ومستقلة' : 'Strictly owner-side, fiduciary, and independent',
                  },
                  {
                    d: isRTL ? 'فريق التنفيذ' : 'Delivery team',
                    a: isRTL ? 'الشريك يبيع، والمستشار المبتدئ ينفّذ' : 'Partner sells, junior bench delivers',
                    c: isRTL ? 'الشركاء التنفيذيون ينفّذون كل تكليف شخصياً' : 'Principals deliver every mandate personally',
                  },
                  {
                    d: isRTL ? 'الأساس المعرفي' : 'Grounding',
                    a: isRTL ? 'أطر ومعايير من الخارج' : 'Frameworks and benchmarks from the outside',
                    c: isRTL ? '60+ عاماً من القيادة العملية للأرباح والخسائر داخل علامات عالمية' : '60+ years of hands-on P&L leadership inside global brands',
                  },
                  {
                    d: isRTL ? 'منطق النطاق' : 'Scope logic',
                    a: isRTL ? 'العمليات أو الرقمنة تُباع بشكل منفصل' : 'Operations or digital, sold separately',
                    c: isRTL ? 'تكليف واحد متكامل عبر التشغيل والتجاري والذكاء الاصطناعي' : 'One integrated mandate across operations, commercial, and AI',
                  },
                  {
                    d: isRTL ? 'الأدلة' : 'Evidence',
                    a: isRTL ? 'توصيات قائمة على الرأي' : 'Opinion-led recommendations',
                    c: isRTL ? 'تحليلات تجريبية، انضباط Six Sigma، مؤشرات أداء قابلة للقياس' : 'Empirical analytics, Six Sigma discipline, measurable KPIs',
                  },
                  {
                    d: isRTL ? 'التمكين الرقمي' : 'Digital enablement',
                    a: isRTL ? 'تنتهي النصيحة عند التقرير' : 'Advice ends at the report',
                    c: isRTL ? 'altus HK&P: منصة تعلّم وأداء حصرية تعيش داخل مؤسسة العميل' : 'altus Hospitality Knowledge & Performance: a proprietary learning and performance platform that lives on inside the client',
                  },
                  {
                    d: isRTL ? 'نهاية التكليف' : 'Engagement end',
                    a: isRTL ? 'تسليم التقرير يُغلق الملف' : 'Report handover closes the file',
                    c: isRTL ? 'أدلة تشغيلية، نقل قدرات، وتحالف دائم' : 'Playbooks, capability transfer, and an enduring alliance',
                  },
                  {
                    d: isRTL ? 'العمق الإقليمي' : 'Regional depth',
                    a: isRTL ? 'تغطية عابرة، دون تجذّر محلي' : 'Fly-in, fly-out coverage',
                    c: isRTL ? 'متجذّرون في الرياض، ثنائيو اللغة، ومتوافقون مع رؤية 2030' : 'Riyadh-rooted, bilingual, Vision 2030-aligned by design',
                  },
                  {
                    d: isRTL ? 'فلسفة الأتعاب' : 'Fee philosophy',
                    a: isRTL ? 'الساعات المحتسبة هي الهدف' : 'Billable hours as the objective',
                    c: isRTL ? 'نجاح العميل أولاً: الشروط التجارية تتبع النتائج' : 'Client success first: commercial terms follow outcomes',
                  },
                ].map((row) => (
                  <tr key={row.d} className="border-b last:border-0" style={{ borderColor: COLOR.sand }}>
                    <td className="p-4 text-xs font-bold align-top" style={{ ...neueHaas, color: COLOR.charcoal }}>{row.d}</td>
                    <td className="p-4 text-xs align-top" style={{ ...inter, color: COLOR.slate }}>
                      <span className="flex items-start gap-2"><X className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400/70" />{row.a}</span>
                    </td>
                    <td className="p-4 text-xs align-top font-medium" style={{ ...inter, color: COLOR.emerald, backgroundColor: `${COLOR.emerald}0D` }}>
                      <span className="flex items-start gap-2"><Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: COLOR.emerald }} />{row.c}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs sm:text-sm mt-8" style={{ ...inter, color: COLOR.slate }}>
            {isRTL
              ? 'المقارنة صريحة بقصد: يستحق العملاء معرفة ما يشترونه بالضبط.'
              : 'The comparison is candid by intent: clients deserve to know exactly what they are buying.'}
          </p>
          <p className="text-center text-base sm:text-lg italic mt-4 max-w-2xl mx-auto" style={{ ...canela, color: COLOR.charcoal }}>
            {isRTL
              ? '"الفارق الحقيقي لألتوس في جملة واحدة: نُقاس بعوائدكم، حاضرون في صفكم، ومسؤولون عن النتيجة، لا عن التقرير."'
              : '“The Altus difference in one sentence: we are measured by your returns, present at your side, and accountable for the result, not the report.”'}
          </p>
        </div>
      </section>

      {/* ═══════════════ SECTION 5G: THE ALTUS PORTAL (CHARCOAL) ═══════════════ */}
      <section id="portal" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.charcoal }}>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...neueHaas, color: COLOR.copper }}>
              {isRTL ? 'الدخول الآمن' : 'Secure Access'}
            </div>
            <h2 className="text-3xl sm:text-5xl text-white font-normal leading-tight mb-5" style={neueHaas}>
              {isRTL ? (
                <>البوابة <span className="italic" style={{ ...canela, color: COLOR.copper }}>الرقمية لألتوس.</span></>
              ) : (
                <>The Altus <span className="italic" style={{ ...canela, color: COLOR.copper }}>Portal.</span></>
              )}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-8 max-w-xl" style={{ ...inter, color: '#94A3B8' }}>
              {isRTL
                ? 'هذا الموقع هو أيضاً بوابتك: مساحة عمل آمنة لفرق ألتوس، والمنشآت الشريكة، وموظفي الخط الأمامي — تجمع بين الاستشارة والمنتج الرقمي في مكان واحد.'
                : 'This site is also your gateway: a secure workspace for Altus teams, partner properties, and front-line staff — bringing the advisory and the digital product together in one place.'}
            </p>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 mb-9">
              {[
                isRTL ? 'منصة altus HK&P: مسارات تعلّم، تقييم، وشهادات' : 'altus HK&P: learning paths, assessment & certification',
                isRTL ? 'لوحات أداء المنشآت وتحليلات GOPPAR الحية' : 'Property performance dashboards & live GOPPAR analytics',
                isRTL ? 'مكتبة المعرفة والمستندات المعتمدة' : 'Knowledge base & approved document library',
                isRTL ? 'إدارة الفرق، الأدوار، والصلاحيات لكل منشأة' : 'Team, role, and permission management per property',
                isRTL ? 'مساعد ذكاء اصطناعي محكوم يجيب من المحتوى المعتمد' : 'Governed AI assistant answering from approved content only',
                isRTL ? 'التحقق العلني من صحة الشهادات الصادرة' : 'Public verification of issued certificates',
              ].map((f) => (
                <div key={f} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: COLOR.copper }} />
                  <span className="text-xs sm:text-sm text-slate-300" style={inter}>{f}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => navigate('/login')}
                className="h-11 px-7 rounded-none text-xs font-bold tracking-[0.15em] uppercase text-white shadow-md hover:opacity-90"
                style={{ background: COLOR.copper }}
              >
                <Lock className="me-2 h-3.5 w-3.5" />
                {isRTL ? 'الدخول إلى البوابة' : 'SIGN IN TO YOUR PORTAL'}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/verify')}
                className="h-11 px-7 rounded-none border border-white/20 bg-transparent hover:bg-white/5 text-white/90 text-xs font-semibold tracking-[0.15em] uppercase"
                style={neueHaas}
              >
                {isRTL ? 'التحقق من شهادة' : 'VERIFY A CERTIFICATE'}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-2 p-8 sm:p-10 border" style={{ backgroundColor: COLOR.charcoalDeep, borderColor: `${COLOR.copper}40` }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${COLOR.copper}20` }}>
                <ShieldCheck className="w-5 h-5" style={{ color: COLOR.copper }} />
              </div>
              <div>
                <div className="text-white text-sm font-bold" style={neueHaas}>{isRTL ? 'هل أنت مالك أو مستثمر جديد؟' : 'New owner or investor?'}</div>
                <div className="text-xs text-slate-400" style={inter}>{isRTL ? 'ابدأ بمحادثة، لا حساب' : 'Start with a conversation, not an account'}</div>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6" style={{ ...inter, color: '#94A3B8' }}>
              {isRTL
                ? 'إن لم تكن بعد عميلاً أو عضواً في فريق منشأة شريكة، فإن نقطة البداية هي إحاطة سرية مع أحد الشركاء، وليس تسجيل الدخول.'
                : 'If you’re not yet a client or a member of a partner property team, the right first step is a confidential briefing with a partner, not a login.'}
            </p>
            <Button
              onClick={() => setBriefingOpen(true)}
              variant="outline"
              className="w-full h-11 rounded-none border bg-transparent text-xs font-bold tracking-[0.15em] uppercase transition-[background-color] duration-200 hover:bg-amber-600/10"
              style={{ borderColor: COLOR.copper, color: COLOR.copper }}
            >
              {isRTL ? 'طلب إحاطة شريك' : 'REQUEST A BRIEFING'}
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 6: CTA (CHARCOAL DEEP WITH ART DECO) ═══════════════ */}
      <section className="relative py-32 sm:py-40 px-4 text-center overflow-hidden" style={{ backgroundColor: COLOR.charcoalDeep }}>
        {/* Bottom Art Deco background */}
        <div
          className="absolute inset-0 bg-cover bg-bottom bg-no-repeat opacity-30 pointer-events-none"
          style={{ backgroundImage: "url('/cta-bottom-bg.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#16191E] via-transparent to-transparent pointer-events-none" />

        <FadeInSection className="relative z-10 max-w-3xl mx-auto space-y-6">
          <h2
            className="text-3xl sm:text-5xl md:text-6xl text-white font-normal leading-tight"
            style={neueHaas}
          >
            {isRTL ? (
              <>حوار خاص ومباشر <br /><span className="italic" style={{ ...canela, color: COLOR.copper }}>مع أحد الشركاء.</span></>
            ) : (
              <>A private conversation <br /><span className="italic" style={{ ...canela, color: COLOR.copper }}>with a partner.</span></>
            )}
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto" style={{ ...inter, color: '#94A3B8' }}>
            {isRTL
              ? 'تُعالج جميع الاستفسارات بسرية تامة. سيتواصل معك أحد الشركاء التنفيذيين خلال يومي عمل.'
              : 'All enquiries are received in confidence. A partner will respond directly within two business days.'}
          </p>

          <div className="pt-4" style={neueHaas}>
            <Button
              size="lg"
              onClick={() => setBriefingOpen(true)}
              className="h-12 px-8 rounded-none text-xs font-bold tracking-[0.2em] uppercase text-white shadow-lg transition-opacity duration-200 hover:opacity-90"
              style={{ background: COLOR.copper }}
            >
              {isRTL ? 'طلب إحاطة شريك' : 'REQUEST A BRIEFING'}
            </Button>
          </div>
        </FadeInSection>
      </section>

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
                <li><a href="#about" className="hover:text-amber-500 transition-colors">{isRTL ? 'من نحن' : 'About'}</a></li>
                <li><a href="#about" className="hover:text-amber-500 transition-colors">{isRTL ? 'لماذا ألتوس' : 'Why Altus'}</a></li>
                <li><a href="#leadership" className="hover:text-amber-500 transition-colors">{isRTL ? 'القيادة' : 'Leadership'}</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-white uppercase tracking-wider mb-3 text-xs" style={neueHaas}>
                {isRTL ? 'الخدمات' : 'SERVICES'}
              </h5>
              <ul className="space-y-2 text-slate-400 text-xs" style={inter}>
                <li><a href="#practices" className="hover:text-amber-500 transition-colors">{isRTL ? 'حلول الضيافة' : 'Hospitality Solutions'}</a></li>
                <li><a href="#practices" className="hover:text-amber-500 transition-colors">{isRTL ? 'نمو الأعمال' : 'Business Growth'}</a></li>
                <li><a href="#practices" className="hover:text-amber-500 transition-colors">{isRTL ? 'منصة HK&P' : 'HK&P Platform'}</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-white uppercase tracking-wider mb-3 text-xs" style={neueHaas}>
                {isRTL ? 'المنهجية' : 'METHODOLOGY'}
              </h5>
              <ul className="space-y-2 text-slate-400 text-xs" style={inter}>
                <li><a href="#ascent" className="hover:text-amber-500 transition-colors">{isRTL ? 'ألتوس أسنت™' : 'Altus Ascent™'}</a></li>
                <li><a href="#ascent" className="hover:text-amber-500 transition-colors">{isRTL ? 'رؤية 2030' : 'Saudi Vision 2030'}</a></li>
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
  );
}
