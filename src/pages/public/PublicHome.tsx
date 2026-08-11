import { FloatingConciergeBadge } from '@/components/public/FloatingConciergeBadge';
import { RevealUp } from '@/components/public/RevealUp';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
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
    <div className="flex flex-col">
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
              : 'A boutique strategy house at the intersection of elite hospitality operations and advanced business intelligence — engineered for the Kingdom’s next decade.'}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2" style={neueHaas}>
            <Button
              size="lg"
              onClick={openBriefing}
              className="h-12 px-8 rounded-none text-[11px] font-semibold tracking-[0.2em] uppercase transition-[box-shadow] duration-200 shadow-md hover:shadow-lg"
              style={{ background: COLOR.copper, color: '#FFFFFF' }}
            >
              {isRTL ? 'طلب إحاطة شريك' : 'REQUEST A BRIEFING'}
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/about')}
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
    </div>
  );
}
