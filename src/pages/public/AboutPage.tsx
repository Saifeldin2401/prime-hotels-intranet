import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useBriefing } from './PublicLayout';
import { FadeInSection, StaggerChildren } from './publicComponents';
import { COLOR, canela, inter, mono, neueHaas, staggerItem } from './publicConstants';

export default function AboutPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { openBriefing } = useBriefing();

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
  ];

  return (
    <div className="flex flex-col pt-20">
      {/* ═══════════════ WHY ALTUS (THE EDGE) ═══════════════ */}
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
                  ? 'قيادة صُقلت داخل أنظمة ماريوت وIHG وستارووود وأكور. أكثر من 60 عاماً من المسؤولية المباشرة عن الأرباح والخسائر، لا أطر نظرية.'
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

      {/* ═══════════════ TWO DIVISIONS ═══════════════ */}
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
            {practices.map((pr) => (
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
                    onClick={openBriefing}
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

      {/* ═══════════════ HK&P PLATFORM ═══════════════ */}
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
          </div>
        </div>
      </section>

      {/* ═══════════════ INDUSTRIES WE SERVE ═══════════════ */}
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
        </div>
      </section>
    </div>
  );
}
