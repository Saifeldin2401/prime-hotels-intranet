import { FloatingConciergeBadge } from '@/components/public/FloatingConciergeBadge';
import { RevealUp } from '@/components/public/RevealUp';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Award, BarChart3, Building2, CheckCircle2, ChevronRight, Compass, ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useBriefing } from './PublicLayout';
import { CopperDivider, CountUp, FadeInSection, StaggerChildren } from './publicComponents';
import { COLOR, canela, inter, mono, neueHaas, staggerItem } from './publicConstants';

export default function PublicHome() {
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const navigate = useNavigate();
  const { openBriefing } = useBriefing();

  return (
    <div className="flex flex-col selection:bg-[#C45B2F]/30 selection:text-white">
      {/* ═══════════════════════ SECTION 1: HERO ═══════════════════════ */}
      <section
        className="relative min-h-[92vh] lg:min-h-screen flex flex-col items-center justify-center pt-28 pb-20 px-4 sm:px-6 lg:px-8 text-center overflow-hidden"
        style={{ background: `linear-gradient(180deg, #111419 0%, ${COLOR.charcoalDeep} 60%, #0B0E14 100%)` }}
      >
        {/* Art Deco Geometric Grid & Ambient Glows */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
          backgroundImage: `
            radial-gradient(circle at 50% 30%, rgba(196, 91, 47, 0.25) 0%, transparent 60%),
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 60px 60px, 60px 60px'
        }} />

        {/* Art Deco Geometric Decorative Corner Accents */}
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
              style={neueHaas}
            >
              {isRTL ? 'معهد المعرفة وأداء الضيافة' : 'ACADEMY & KNOWLEDGE PERFORMANCE'}
            </span>
          </div>

          {/* Main Headline with Canela display typography */}
          <h1
            className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.25rem] text-white font-normal leading-[1.04] tracking-[-0.015em] drop-shadow-sm"
            style={canela}
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
          <p className="text-base sm:text-lg lg:text-xl font-normal max-w-2xl mx-auto leading-relaxed text-slate-300" style={inter}>
            {isRTL
              ? 'منظومة استشارية نخبوية تجمع بين عمليات الضيافة الفاخرة وذكاء الأعمال المتقدم — مصممة للعقد القادم في المملكة العربية السعودية.'
              : 'A boutique strategy house at the intersection of elite hospitality operations and advanced business intelligence — engineered for the Kingdom’s next decade.'}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4" style={neueHaas}>
            <Button
              size="lg"
              onClick={openBriefing}
              className="h-13 px-9 rounded-none text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 bg-[#C45B2F] hover:bg-[#D96B3D] text-white shadow-xl shadow-[#C45B2F]/25 hover:shadow-2xl hover:shadow-[#C45B2F]/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Sparkles className="w-3.5 h-3.5 me-2 text-white/90" />
              {isRTL ? 'طلب إحاطة شريك' : 'REQUEST A BRIEFING'}
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/about')}
              className="h-13 px-8 rounded-none border border-white/30 bg-white/[0.03] hover:bg-white/10 text-white text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 backdrop-blur-sm hover:-translate-y-0.5"
            >
              {isRTL ? 'استكشف الخدمات' : 'EXPLORE THE PRACTICE'}
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
                <div className="text-[11px] uppercase tracking-[0.2em] font-medium mt-2 text-slate-400" style={neueHaas}>
                  {stat.label}
                </div>
              </motion.div>
            );
          })}
        </StaggerChildren>
      </section>

      {/* ═══════════════════ SECTION 2: FIDUCIARY (CREAMY WHITE) ═══════════════════ */}
      <section id="about" className="py-24 sm:py-32 px-4 sm:px-6 relative" style={{ backgroundColor: COLOR.creamyWhite }}>
        <FadeInSection className="max-w-4xl mx-auto space-y-12 text-center">
          <CopperDivider />

          {/* Section Kicker */}
          <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#C45B2F]" style={neueHaas}>
            {isRTL ? '٠٢ — ميثاق الأمانة المؤسسية' : '02 — THE FIDUCIARY MANDATE'}
          </div>

          <h2
            className="text-2xl sm:text-4xl md:text-[2.75rem] font-normal leading-[1.3] text-[#1E2329]"
            style={canela}
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
              <div key={col.title} className="p-6 rounded-xl border border-[#D9C6A3]/60 bg-white/70 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-full bg-[#2E7D5A]/10 text-[#2E7D5A] flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold uppercase tracking-wider mb-2 text-[#1E2329]" style={neueHaas}>
                  {col.title}
                </h4>
                <p className="text-sm leading-relaxed text-[#5B6775]" style={inter}>
                  {col.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-4 max-w-2xl mx-auto">
            <p className="text-sm leading-relaxed text-[#5B6775]" style={inter}>
              {isRTL
                ? 'كل مهمة ينفذها الشركاء التنفيذيون مباشرة، تقاس بعوائد المالك، وتُؤسسن عبر التسليم المنظم.'
                : 'Every capability delivered by principals, measured against owner returns, and institutionalised through structured handover.'}
            </p>
          </div>
        </FadeInSection>
      </section>
    </div>
  );
}

