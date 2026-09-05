import { FloatingConciergeBadge } from '@/components/public/FloatingConciergeBadge';
import { RevealUp } from '@/components/public/RevealUp';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Compass,
  Cpu,
  Layers,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useBriefing } from './PublicLayout';
import { CopperDivider, CountUp, FadeInSection, StaggerChildren } from './publicComponents';
import { COLOR, cairo, canela, inter, mono, neueHaas, staggerItem } from './publicConstants';

export default function PublicHome() {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

  useEffect(() => {
    const handleLangChange = (lng: string) => setCurrentLang(lng);
    i18n.on('languageChanged', handleLangChange);
    return () => i18n.off('languageChanged', handleLangChange);
  }, [i18n]);

  const isRTL = currentLang === 'ar' || currentLang.startsWith('ar') || i18n.dir() === 'rtl';
  const navigate = useNavigate();
  const { openBriefing } = useBriefing();

  const fontSans = isRTL ? cairo : neueHaas;
  const fontSerif = isRTL ? cairo : canela;
  const fontBody = isRTL ? cairo : inter;

  return (
    <div className="flex flex-col selection:bg-[#C45B2F]/30 selection:text-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ═══════════════════════ SECTION 1: HERO ═══════════════════════ */}
      <section
        className="relative min-h-[92vh] lg:min-h-screen flex flex-col items-center justify-center pt-28 pb-20 px-4 sm:px-6 lg:px-8 text-center overflow-hidden"
        style={{ background: `linear-gradient(180deg, #111419 0%, ${COLOR.charcoalDeep} 60%, #0B0E14 100%)` }}
      >
        {/* Art Deco Geometric Grid & Ambient Glows */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 30%, rgba(196, 91, 47, 0.25) 0%, transparent 60%),
              linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 60px 60px, 60px 60px',
          }}
        />

        {/* Art Deco Corner Accents */}
        <div className="absolute top-24 start-8 w-24 h-24 border-t border-s border-[#C45B2F]/30 pointer-events-none hidden lg:block opacity-60">
          <div className="w-4 h-4 border-t-2 border-s-2 border-[#C45B2F]" />
        </div>
        <div className="absolute top-24 end-8 w-24 h-24 border-t border-e border-[#C45B2F]/30 pointer-events-none hidden lg:block opacity-60">
          <div className="w-4 h-4 border-t-2 border-e-2 border-[#C45B2F] ms-auto" />
        </div>

        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#C45B2F]/10 via-transparent to-transparent pointer-events-none" />

        {/* Floating Concierge Badge */}
        <div className="absolute bottom-12 end-8 z-20 hidden xl:block">
          <FloatingConciergeBadge
            number={isRTL ? '٠١' : '01'}
            label={isRTL ? 'مختارات • الكونسييرج' : 'CONCIERGE • SELECTION'}
          />
        </div>

        <RevealUp className="relative z-10 max-w-4xl mx-auto space-y-8">
          {/* Subtitle / Brand Kicker */}
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-[#C45B2F]/40 bg-[#C45B2F]/10 backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#C45B2F] animate-pulse" />
            <span
              className="text-[11px] sm:text-xs uppercase tracking-[0.25em] font-semibold text-[#E07A5F]"
              style={fontSans}
            >
              {isRTL ? 'معهد المعرفة وأداء الضيافة في المملكة' : 'ACADEMY & KNOWLEDGE PERFORMANCE'}
            </span>
          </div>

          {/* Main Headline */}
          <h1
            className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.25rem] text-white font-normal leading-[1.04] tracking-[-0.015em] drop-shadow-sm"
            style={fontSerif}
          >
            {isRTL ? (
              <>
                الارتقاء <br />
                بالضيافة <br />
                <span className="italic font-light" style={{ color: '#E07A5F' }}>و أداء</span> <br />
                الأعمال.
              </>
            ) : (
              <>
                Knowledge. <br />
                Performance. <br />
                <span className="italic font-light" style={{ color: '#E07A5F' }}>Impact.</span>
              </>
            )}
          </h1>

          {/* Sub-headline */}
          <p className="text-base sm:text-lg lg:text-xl font-normal max-w-2xl mx-auto leading-relaxed text-slate-300" style={fontBody}>
            {isRTL
              ? 'منظومة استشارية نخبوية تجمع بين عمليات الضيافة الفاخرة وذكاء الأعمال المتقدم — مصممة للعقد القادم في المملكة العربية السعودية.'
              : 'A boutique strategy house at the intersection of elite hospitality operations and advanced business intelligence — engineered for the Kingdom’s next decade.'}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4" style={fontSans}>
            <Button
              size="lg"
              onClick={openBriefing}
              className="h-13 px-9 rounded-xl text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 bg-[#C45B2F] hover:bg-[#D96B3D] text-white shadow-xl shadow-[#C45B2F]/25 hover:shadow-2xl hover:shadow-[#C45B2F]/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Sparkles className="w-3.5 h-3.5 me-2 text-white/90" />
              {isRTL ? 'طلب إحاطة شريك' : 'REQUEST A BRIEFING'}
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/about')}
              className="h-13 px-8 rounded-xl border border-white/30 bg-white/[0.03] hover:bg-white/10 text-white text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 backdrop-blur-sm hover:-translate-y-0.5"
            >
              {isRTL ? 'استكشف المنظومة' : 'EXPLORE THE FIRM'}
              <ChevronRight className={`w-4 h-4 ms-1.5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </RevealUp>

        {/* Stats Counter Bar - IBM Plex Mono Technical Numbers */}
        <StaggerChildren className="relative z-10 w-full max-w-4xl mx-auto mt-20 pt-10 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '6.1M+', label: isRTL ? 'تأثير إيرادي بالريال' : 'Revenue impact (SAR)', icon: BarChart3 },
            { value: '12', label: isRTL ? 'أطر عمل استراتيجية' : 'Strategic frameworks', icon: Compass },
            { value: '13', label: isRTL ? 'أصل تحت الإشراف' : 'Assets under oversight', icon: Building2 },
            { value: '2', label: isRTL ? 'أقسام ممارسة متخصصة' : 'Practice divisions', icon: Award },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                variants={staggerItem}
                className="group p-5 rounded-2xl border border-white/5 hover:border-[#C45B2F]/50 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300 shadow-lg"
              >
                <div className="w-8 h-8 rounded-lg bg-[#C45B2F]/10 border border-[#C45B2F]/30 mx-auto mb-2 flex items-center justify-center text-[#E07A5F] group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold tracking-tight text-white" style={mono}>
                  <CountUp target={stat.value} />
                </div>
                <div className="text-[11px] uppercase tracking-[0.2em] font-medium mt-2 text-slate-400" style={fontSans}>
                  {stat.label}
                </div>
              </motion.div>
            );
          })}
        </StaggerChildren>
      </section>

      {/* ═══════════════════ SECTION 2: FIDUCIARY MANDATE (CREAMY WHITE) ═══════════════════ */}
      <section id="about" className="py-24 sm:py-32 px-4 sm:px-6 relative" style={{ backgroundColor: COLOR.creamyWhite }}>
        <FadeInSection className="max-w-5xl mx-auto space-y-12 text-center">
          <CopperDivider />

          {/* Section Kicker */}
          <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#C45B2F]" style={fontSans}>
            {isRTL ? '٠٢ — ميثاق الأمانة المؤسسية' : '02 — THE FIDUCIARY MANDATE'}
          </div>

          <h2
            className="text-2xl sm:text-4xl md:text-[2.75rem] font-normal leading-[1.3] text-[#1E2329]"
            style={fontSerif}
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
                desc: isRTL ? 'منهجية Six Sigma تدعم كل توصية استشارية بدقة متناهية.' : 'Six Sigma discipline underpins every recommendation.',
              },
              {
                title: isRTL ? 'نقل القدرات المؤسسية' : 'Institutional transfer.',
                desc: isRTL ? 'كل مهمة تنتهي بتوطين القدرات والأنظمة داخل المنشأة.' : 'Every engagement ends with institutional capability, not a report on a shelf.',
              },
            ].map((col) => (
              <div key={col.title} className="p-6 rounded-2xl border border-[#D9C6A3]/60 bg-white/70 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-full bg-[#2E7D5A]/10 text-[#2E7D5A] flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold uppercase tracking-wider mb-2 text-[#1E2329]" style={fontSans}>
                  {col.title}
                </h4>
                <p className="text-sm leading-relaxed text-[#5B6775]" style={fontBody}>
                  {col.desc}
                </p>
              </div>
            ))}
          </div>
        </FadeInSection>
      </section>

      {/* ═══════════════════ SECTION 3: PRACTICE DIVISIONS ═══════════════════ */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 relative border-t border-white/10" style={{ backgroundColor: COLOR.charcoalDeep }}>
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="max-w-3xl mb-16 text-start">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4 text-[#C45B2F]" style={fontSans}>
              {isRTL ? '٠٣ — مجالات الممارسة المتخصصة' : '03 — PRACTICE DIVISIONS'}
            </div>
            <h2 className="text-3xl sm:text-5xl text-white font-normal leading-tight" style={fontSerif}>
              {isRTL ? (
                <>هندسة تشغيلية. <span className="italic text-[#E07A5F]">ذكاء رقمي.</span></>
              ) : (
                <>Operational engineering. <span className="italic text-[#E07A5F]">Applied intelligence.</span></>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mt-4" style={fontBody}>
              {isRTL
                ? 'تنقسم قدرات ألتوس استشارات إلى جناحين متكاملين: التميز التشغيلي الفندقي الميداني، وطبقة الذكاء الاصطناعي التطبيقي لتحسين الإيرادات.'
                : 'Altus Advisory operates across two integrated divisions: deep field-level hospitality operations, and an advanced intelligence layer for commercial yield.'}
            </p>
          </FadeInSection>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Division I */}
            <div className="p-8 sm:p-10 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-[#C45B2F]/40 hover:bg-white/[0.04] transition-all duration-300 space-y-6 flex flex-col justify-between text-start">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#C45B2F]/15 text-[#E07A5F] flex items-center justify-center border border-[#C45B2F]/30">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#E07A5F]" style={fontSans}>
                  {isRTL ? 'القسم الأول • العمليات والأصول' : 'DIVISION I • ASSET OPERATIONS'}
                </div>
                <h3 className="text-2xl text-white font-medium" style={fontSerif}>
                  {isRTL ? 'حلول الضيافة والأصول الفندقية' : 'Hospitality Solutions & Asset Operations'}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed" style={fontBody}>
                  {isRTL
                    ? 'الهندسة التشغيلية المتميزة وإدارة نمو الأصول، من المخطط الأولي ودراسة الجدوى الفندقية إلى ما قبل الافتتاح والحوكمة التشغيلية الكاملة.'
                    : 'Engineering operational excellence and delivering sustained asset growth, from feasibility validation to pre-opening and full maturity.'}
                </p>
                <ul className="space-y-2.5 pt-2 text-xs text-slate-300">
                  {(isRTL
                    ? ['تطوير الفنادق وتمثيل المالك والحوكمة', 'تحسين العمليات ودعم ما قبل الافتتاح', 'تعظيم RevPAR ومراجعة معايير الجودة']
                    : ['Hotel Development & Owner Representation', 'Operations Optimization & Pre-Opening Support', 'RevPAR Enhancement & 5-Star Quality Audits']
                  ).map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#E07A5F] shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                variant="outline"
                onClick={() => navigate('/about')}
                className="w-full h-11 border-white/20 bg-white/[0.02] hover:bg-white/10 text-white text-xs font-bold tracking-wider uppercase rounded-xl"
                style={fontSans}
              >
                {isRTL ? 'استكشف حلول الضيافة' : 'EXPLORE DIVISION I'}
                <ChevronRight className={`w-4 h-4 ms-1 ${isRTL ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* Division II */}
            <div className="p-8 sm:p-10 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-[#C45B2F]/40 hover:bg-white/[0.04] transition-all duration-300 space-y-6 flex flex-col justify-between text-start">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#C45B2F]/15 text-[#E07A5F] flex items-center justify-center border border-[#C45B2F]/30">
                  <Cpu className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#E07A5F]" style={fontSans}>
                  {isRTL ? 'القسم الثاني • الذكاء والنمو' : 'DIVISION II • INTELLIGENCE & AI'}
                </div>
                <h3 className="text-2xl text-white font-medium" style={fontSerif}>
                  {isRTL ? 'نمو الأعمال والذكاء الاصطناعي التطبيقي' : 'Business Growth & Applied AI Solutions'}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed" style={fontBody}>
                  {isRTL
                    ? 'حيث تلتقي عراقة الضيافة بالذكاء الرقمي: استراتيجيات تجارية مدعومة بالبيانات، تسعير ديناميكي، وتميز متمحور حول الكفاءة البشرية.'
                    : 'Where hospitality meets advanced intelligence: dynamic pricing algorithms, predictive yield models, and data-driven commercial performance.'}
                </p>
                <ul className="space-y-2.5 pt-2 text-xs text-slate-300">
                  {(isRTL
                    ? ['إدارة العائد التنبؤية والتسعير الديناميكي', 'لوحات تحكم تنفيذية ومراقبة انحرافات الأداء', 'تطوير القيادات التنفيذية وتوطين القدرات']
                    : ['Predictive Yield Management & Dynamic Pricing', 'Board-Grade Dashboards & Variance Alerting', 'Executive Coaching & Saudi Talent Empowerment']
                  ).map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#E07A5F] shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                variant="outline"
                onClick={() => navigate('/digital')}
                className="w-full h-11 border-white/20 bg-white/[0.02] hover:bg-white/10 text-white text-xs font-bold tracking-wider uppercase rounded-xl"
                style={fontSans}
              >
                {isRTL ? 'استكشف حلول الذكاء' : 'EXPLORE DIVISION II'}
                <ChevronRight className={`w-4 h-4 ms-1 ${isRTL ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ SECTION 4: ALTUS ASCENT™ 6-STAGE METHODOLOGY ═══════════════════ */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 relative border-t border-white/10" style={{ backgroundColor: '#0F1218' }}>
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C45B2F]/10 border border-[#C45B2F]/30 text-[#E07A5F] text-[11px] font-bold uppercase tracking-wider" style={fontSans}>
              <Layers className="w-3.5 h-3.5" />
              {isRTL ? 'المنهجية التشغيلية الملكية' : 'PROPRIETARY EXECUTION FRAMEWORK'}
            </div>
            <h2 className="text-3xl sm:text-5xl text-white font-normal" style={fontSerif}>
              Altus Ascent™
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed" style={fontBody}>
              {isRTL
                ? 'إطار عمل من ٦ مراحل منضبطة يحول المنشآت الفندقية من التشخيص الأولي إلى الاستدامة المؤسسية الكاملة.'
                : 'A structured 6-stage operational pathway transforming hotel assets from initial diagnostics to self-sustaining compounding returns.'}
            </p>
          </FadeInSection>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { num: '01', titleEn: 'Discover', titleAr: 'اكتشاف', descEn: 'Immersive diagnostic & audits', descAr: 'تشخيص شامل وغرف بيانات' },
              { num: '02', titleEn: 'Assess', titleAr: 'تقييم', descEn: 'Gap analysis & financial model', descAr: 'تحليل فجوات ونمذجة مالية' },
              { num: '03', titleEn: 'Design', titleAr: 'تصميم', descEn: 'Target operating blueprint', descAr: 'المخطط الاستراتيجي المستهدف' },
              { num: '04', titleEn: 'Transform', titleAr: 'تحويل', descEn: 'Embedded execution', descAr: 'تنفيذ ميداني مباشر ومواكبة' },
              { num: '05', titleEn: 'Optimise', titleAr: 'تحسين', descEn: 'Live KPI instrumentation', descAr: 'ضبط التسعير ومؤشرات حية' },
              { num: '06', titleEn: 'Scale', titleAr: 'توسّع', descEn: 'Governance & capability handover', descAr: 'المأسسة ونقل المعرفة المستدام' },
            ].map((stage) => (
              <div
                key={stage.num}
                className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-[#C45B2F]/50 hover:bg-white/[0.05] transition-all text-start group flex flex-col justify-between"
              >
                <div>
                  <div className="text-2xl font-bold text-[#C45B2F] mb-3 group-hover:scale-110 transition-transform" style={mono}>
                    {stage.num}
                  </div>
                  <h4 className="text-base font-semibold text-white mb-1" style={fontSans}>
                    {isRTL ? stage.titleAr : stage.titleEn}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed" style={fontBody}>
                    {isRTL ? stage.descAr : stage.descEn}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button
              onClick={() => navigate('/methodology')}
              variant="outline"
              className="h-11 px-6 border-white/20 bg-white/[0.03] hover:bg-white/10 text-white text-xs font-bold tracking-wider uppercase rounded-xl"
              style={fontSans}
            >
              {isRTL ? 'تفاصيل مراحل المنهجية بالتفصيل' : 'EXPLORE THE FULL 6 STAGES'}
              <ChevronRight className={`w-4 h-4 ms-1.5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════════ SECTION 5: SAUDI VISION 2030 ALIGNMENT ═══════════════════ */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 relative border-t border-white/10" style={{ backgroundColor: COLOR.charcoal }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-start">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2E7D5A]/20 border border-[#2E7D5A]/40 text-[#4EBA87] text-[11px] font-bold uppercase tracking-wider" style={fontSans}>
                <Sparkles className="w-3.5 h-3.5" />
                {isRTL ? 'مواكبة التحول الوطني' : 'NATIONAL TRANSFORMATION ALIGNMENT'}
              </div>
              <h2 className="text-3xl sm:text-5xl text-white font-normal leading-tight" style={fontSerif}>
                {isRTL ? (
                  <>مهندسة لخدمة <span className="italic text-[#E07A5F]">رؤية السعودية 2030.</span></>
                ) : (
                  <>Engineered for <span className="italic text-[#E07A5F]">Saudi Vision 2030.</span></>
                )}
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed" style={fontBody}>
                {isRTL
                  ? 'رؤية المملكة 2030 تضع قطاع السياحة والضيافة في قلب التنوع الاقتصادي مع استهداف ١٥٠ مليون زيارة سنوية. تعمل ألتوس كشريك استراتيجي يضمن للأصول الفندقية تحقيق معايير عالمية وعوائد مستدامة.'
                  : 'Vision 2030 places tourism and hospitality at the core of national economic diversification. Altus Advisory serves as a strategic partner ensuring hotel investments achieve global tier-1 standards and sustainable RevPAR performance.'}
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                  <div className="text-2xl font-bold text-white mb-1" style={mono}>150M</div>
                  <div className="text-xs text-slate-400" style={fontSans}>
                    {isRTL ? 'مستهدف الزيارات السنوية' : 'Target annual visits'}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                  <div className="text-2xl font-bold text-[#E07A5F] mb-1" style={mono}>10%</div>
                  <div className="text-xs text-slate-400" style={fontSans}>
                    {isRTL ? 'مساهمة الناتج المحلي بحلول 2030' : 'GDP contribution by 2030'}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => navigate('/vision-2030')}
                className="h-12 px-7 bg-[#C45B2F] hover:bg-[#D96B3D] text-white text-xs font-bold tracking-wider uppercase rounded-xl shadow-lg shadow-[#C45B2F]/25"
                style={fontSans}
              >
                {isRTL ? 'استكشف ركائز التوافق الوطني' : 'EXPLORE VISION 2030 PILLARS'}
                <ChevronRight className={`w-4 h-4 ms-1.5 ${isRTL ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* Visual Emblem Card */}
            <div className="p-8 sm:p-12 rounded-3xl border border-[#C45B2F]/30 bg-gradient-to-br from-[#1A1F28] via-[#141820] to-[#0D1016] shadow-2xl relative overflow-hidden text-center space-y-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-[#C45B2F]/15 border-2 border-[#C45B2F] p-4 flex items-center justify-center shadow-[0_0_35px_rgba(196,91,47,0.3)]">
                <img src="/altus-emblem-icon.png" alt="" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-2">
                <div className="text-xl text-white font-medium" style={fontSerif}>
                  {isRTL ? 'ألتوس استشارات • المملكة العربية السعودية' : 'ALTUS ADVISORY • KSA'}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto" style={fontBody}>
                  {isRTL
                    ? 'الريادة، الخبرة الميدانية، والالتزام الصارم بأمانة المستثمر وحوكمة الأصول عبر الرياض وجدة والوجهات السياحية الكبرى.'
                    : 'Fiduciary commitment, local market intelligence, and verified credential governance across Riyadh, Jeddah, and major Red Sea destinations.'}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-[#E07A5F]" />
                <span>{isRTL ? 'منظومة معتمدة وحوكمة مؤسسية' : 'Accredited Corporate Governance'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ SECTION 6: PROVEN TRACK RECORD ═══════════════════ */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 relative border-t border-white/10" style={{ backgroundColor: COLOR.creamyWhite }}>
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="max-w-2xl mb-14 text-start">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4 text-[#C45B2F]" style={fontSans}>
              {isRTL ? '٠٤ — دراسات حالة وإثبات الأثر' : '04 — PROVEN IMPACT & CASE STUDIES'}
            </div>
            <h2 className="text-3xl sm:text-5xl text-[#1E2329] font-normal leading-tight" style={fontSerif}>
              {isRTL ? (
                <>نتائج مقاسة. <span className="italic text-[#2E7D5A]">عوائد حقيقية.</span></>
              ) : (
                <>Measured results. <span className="italic text-[#2E7D5A]">Real returns.</span></>
              )}
            </h2>
            <p className="text-sm sm:text-base text-[#5B6775] leading-relaxed mt-4" style={fontBody}>
              {isRTL
                ? 'تكليفات ومهام قادها شركاؤنا التنفيذيون شخصياً داخل كبرى العلامات الفندقية العالمية والمحافظ المستقلة.'
                : 'Engagements personally led by our managing principals inside global brand portfolios and independent luxury assets.'}
            </p>
          </FadeInSection>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl border border-[#D9C6A3]/70 bg-white/90 shadow-md text-start space-y-5">
              <div className="text-xs font-bold uppercase tracking-wider text-[#C45B2F]" style={fontSans}>
                {isRTL ? 'منتجع رئيسي فاخر • تحويل الأداء' : 'FLAGSHIP LUXURY RESORT • TURNAROUND'}
              </div>
              <h3 className="text-xl font-medium text-[#1E2329]" style={fontSerif}>
                {isRTL ? 'تحويل منتجع رئيسي وريادة سوقية مستدامة' : 'Flagship Resort Turnaround & Market Leadership'}
              </h3>
              <p className="text-sm text-[#5B6775] leading-relaxed" style={fontBody}>
                {isRTL
                  ? 'منتجع شاطئي يضم أكثر من ٣٠٠ غرفة تم رفع مؤشراته وتحقيق المركز الأول في التقييم لست سنوات متتالية وتوفير مالي سنوي قدره ٣٤٠ ألف دولار.'
                  : 'A 300+ key branded beachfront resort turnaround achieving sustained #1 comp set ranking for 6 straight years and $340K annual recurring savings.'}
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#D9C6A3]/40">
                <div>
                  <div className="text-2xl font-bold text-[#2E7D5A]" style={mono}>+25%</div>
                  <div className="text-xs text-[#5B6775]">{isRTL ? 'نمو RevPAR' : 'RevPAR growth'}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#1E2329]" style={mono}>+30%</div>
                  <div className="text-xs text-[#5B6775]">{isRTL ? 'رضا النزلاء' : 'Guest sentiment'}</div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-2xl border border-[#D9C6A3]/70 bg-white/90 shadow-md text-start space-y-5">
              <div className="text-xs font-bold uppercase tracking-wider text-[#C45B2F]" style={fontSans}>
                {isRTL ? 'محفظة قطرية • ١٩ فندقاً' : 'MULTI-PROPERTY • 19 HOTELS'}
              </div>
              <h3 className="text-xl font-medium text-[#1E2329]" style={fontSerif}>
                {isRTL ? 'مهمة تميّز تشغيلي على مستوى المحفظة' : 'Portfolio-Wide Operational Excellence Mandate'}
              </h3>
              <p className="text-sm text-[#5B6775] leading-relaxed" style={fontBody}>
                {isRTL
                  ? 'محفظة تضم أكثر من ٣٠٠٠ غرفة تم توحيد معاييرها التشغيلية ورقمنة تدقيق الجودة ورفع إيراد الأغذية والمشروبات بنسبة ٨٪ خلال ١٨ شهراً.'
                  : 'A 3,000+ room national portfolio under a single operational excellence mandate, elevating F&B yield by 8% within 18 months.'}
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#D9C6A3]/40">
                <div>
                  <div className="text-2xl font-bold text-[#2E7D5A]" style={mono}>19</div>
                  <div className="text-xs text-[#5B6775]">{isRTL ? 'فندقاً تحت مهمة واحدة' : 'Hotels unified'}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#1E2329]" style={mono}>3,000+</div>
                  <div className="text-xs text-[#5B6775]">{isRTL ? 'غرفة ضمن النطاق' : 'Keys in scope'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <Button
              onClick={() => navigate('/case-studies')}
              className="h-12 px-8 bg-[#1E2329] hover:bg-[#2E3540] text-white text-xs font-bold tracking-wider uppercase rounded-xl shadow-md"
              style={fontSans}
            >
              {isRTL ? 'عرض كافة دراسات الحالة الموثقة' : 'VIEW ALL CASE STUDIES'}
              <ChevronRight className={`w-4 h-4 ms-1.5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
