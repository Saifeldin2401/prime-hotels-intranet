import { useTranslation } from 'react-i18next';
import { FadeInSection, StaggerChildren } from './publicComponents';
import { COLOR, canela, inter, mono, neueHaas } from './publicConstants';

export default function CaseStudiesPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  return (
    <div className="flex flex-col pt-20">
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
    </div>
  );
}
