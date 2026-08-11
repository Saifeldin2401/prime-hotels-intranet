import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useBriefing } from './PublicLayout';
import { FadeInSection, StaggerChildren } from './publicComponents';
import { COLOR, canela, inter, mono, neueHaas, staggerItem } from './publicConstants';

export default function MethodologyPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { openBriefing } = useBriefing();

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

  return (
    <div className="flex flex-col pt-20">
      {/* ═══════════════ ALTUS ASCENT™ ═══════════════ */}
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

          <div className="text-center mt-10">
            <button
              onClick={openBriefing}
              className="text-[11px] font-semibold tracking-[0.15em] uppercase flex items-center gap-2 mx-auto transition-colors duration-300 hover:opacity-80"
              style={{ ...neueHaas, color: COLOR.emerald }}
            >
              <span>{isRTL ? 'المنهجية الكاملة' : 'THE FULL METHODOLOGY'}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════ STRATEGIC FRAMEWORKS ═══════════════ */}
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

          {/* Performance Matrix */}
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
          </div>

          {/* GOPPAR Stack */}
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

      {/* ═══════════════ INSTITUTIONAL CAPABILITIES ═══════════════ */}
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
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ backgroundColor: COLOR.sand }}>
            {[
              {
                t: isRTL ? 'التشغيل' : 'Operational',
                d: isRTL ? 'بنية إجراءات التشغيل، أنظمة الجودة، جاهزية ما قبل الافتتاح، وهندسة تقديم الخدمة.' : 'SOP architecture, quality systems, pre-opening readiness, service-delivery engineering.',
              },
              {
                t: isRTL ? 'التجاري' : 'Commercial',
                d: isRTL ? 'استراتيجية الإيرادات، فعالية قوة المبيعات، اقتصاديات التوزيع والقنوات.' : 'Revenue strategy, sales-force effectiveness, distribution and channel economics.',
              },
              {
                t: isRTL ? 'المالي' : 'Financial',
                d: isRTL ? 'إعادة هيكلة الأرباح والخسائر، أطر احتواء التكلفة، انضباط الميزانية والتنبؤ.' : 'P&L restructuring, cost-containment frameworks, budgeting and forecasting discipline.',
              },
              {
                t: isRTL ? 'الاستثمار' : 'Investment',
                d: isRTL ? 'التحقق من الجدوى، دعم الاكتتاب، الفحص النافي للجهالة، والتقييم ونمذجة التآزر.' : 'Feasibility validation, underwriting support, due diligence, valuation and synergy modelling.',
              },
              {
                t: isRTL ? 'الرقمنة والذكاء الاصطناعي' : 'Digital & AI',
                d: isRTL ? 'تقييم الجاهزية للذكاء الاصطناعي، التسعير الديناميكي، التحليلات التنبؤية.' : 'AI-readiness assessment, dynamic pricing, predictive analytics, CRM modernization.',
              },
              {
                t: isRTL ? 'التنظيمي' : 'Organisational',
                d: isRTL ? 'إعادة تصميم الهيكل، وضوح الأدوار، تخطيط التعاقب، وتدريب القيادة.' : 'Structure redesign, role clarity, succession planning, leadership coaching.',
              },
              {
                t: isRTL ? 'الحوكمة' : 'Governance',
                d: isRTL ? 'الإشراف على اتفاقيات إدارة الفنادق، مواءمة المالك والمشغل، تطبيق بنود الأداء.' : 'HMA oversight, owner and operator alignment, performance-clause enforcement.',
              },
              {
                t: isRTL ? 'التحوّل' : 'Transformation',
                d: isRTL ? 'إدارة التحول، بروتوكولات التغيير، الدمج بعد الاستحواذ، وبرامج الأداء.' : 'Turnaround management, change protocols, post-merger integration, enterprise performance.',
              },
            ].map((cap) => (
              <div key={cap.t} className="p-6 sm:p-7" style={{ backgroundColor: COLOR.ivory }}>
                <h4 className="text-sm font-bold mb-2.5" style={{ ...neueHaas, color: COLOR.charcoal }}>{cap.t}</h4>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ ...inter, color: COLOR.slate }}>{cap.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
