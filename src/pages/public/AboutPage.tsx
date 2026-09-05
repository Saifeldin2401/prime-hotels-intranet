import { ArrowRight, Award, CheckCircle2, ChevronRight, Compass, Quote, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBriefing } from './PublicLayout';
import { CopperDivider, FadeInSection, StaggerChildren } from './publicComponents';
import { COLOR, cairo, canela, inter, mono, neueHaas, staggerItem } from './publicConstants';

export default function AboutPage() {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

  useEffect(() => {
    const handleLangChange = (lng: string) => setCurrentLang(lng);
    i18n.on('languageChanged', handleLangChange);
    return () => i18n.off('languageChanged', handleLangChange);
  }, [i18n]);

  const isRTL = currentLang === 'ar' || currentLang.startsWith('ar') || i18n.dir() === 'rtl';
  const { openBriefing } = useBriefing();

  const fontSans = isRTL ? cairo : neueHaas;
  const fontSerif = isRTL ? cairo : canela;
  const fontBody = isRTL ? cairo : inter;

  const practices = [
    {
      id: 'division-1',
      tag: isRTL ? 'القسم الأول' : 'Division I',
      title: isRTL ? 'حلول الضيافة والأصول' : 'Hospitality Solutions & Asset Operations',
      desc: isRTL
        ? 'الهندسة التشغيلية المتميزة وإدارة النمو، من المخطط الأولي ودراسة الجدوى إلى النضج التشغيلي الكامل.'
        : 'Engineering operational excellence and delivering sustained growth, from initial blueprint to full asset maturity.',
      services: isRTL
        ? [
            'تطوير الفنادق وتمثيل المالك والحوكمة',
            'تحسين العمليات ودعم ما قبل الافتتاح',
            'دراسات الجدوى والتحقق من الاستثمار',
            'تدقيق معايير الجودة الفندقية وتجربة النزيل',
            'تحسين الأداء التجاري وإيرادات الغرف',
          ]
        : [
            'Hotel Development & Owner Representation',
            'Operations Optimisation & Pre-Opening Support',
            'Feasibility Studies & Investment Validation',
            'Guest Experience Enhancement & Quality Audits',
            'Commercial Performance & RevPAR Improvement',
          ],
    },
    {
      id: 'division-2',
      tag: isRTL ? 'القسم الثاني' : 'Division II',
      title: isRTL ? 'حلول نمو الأعمال والذكاء الاصطناعي' : 'Business Growth & Applied AI Solutions',
      desc: isRTL
        ? 'حيث تلتقي عراقة الضيافة بالذكاء الرقمي: استراتيجيات مدعومة بالبيانات وتميز متمحور حول الكفاءة البشرية.'
        : 'Where hospitality meets advanced intelligence: data-driven commercial strategy and human-centred performance.',
      services: isRTL
        ? [
            'التخطيط الاستراتيجي وإعادة الهيكلة التنظيمية',
            'تحسين الإيرادات والذكاء الاصطناعي التطبيقي',
            'التحول الرقمي ومنظومات العمل الذكية',
            'تطوير القيادات التنفيذية وتوطين القدرات',
            'تقييم الاستثمار وفحص الاندماج والاستحواذ',
          ]
        : [
            'Strategic Planning & Organisational Restructuring',
            'Revenue Optimisation & Applied AI Intelligence',
            'Digital Transformation & Smart Workflows',
            'Executive Leadership & Capability Development',
            'Investment Appraisal & M&A Due Diligence',
          ],
    },
  ];

  return (
    <div className="flex flex-col pt-16 selection:bg-[#C45B2F]/30 selection:text-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ═══════════════ SECTION 1: FIRM PHILOSOPHY & EDITORIAL HERO ═══════════════ */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 relative overflow-hidden" style={{ backgroundColor: COLOR.charcoalDeep }}>
        {/* Subtle Ambient Art Deco Lines */}
        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(196, 91, 47, 0.3) 0%, transparent 70%)',
        }} />

        <FadeInSection className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[#C45B2F]/40 bg-[#C45B2F]/10">
            <span className="w-2 h-2 rounded-full bg-[#C45B2F] animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#E07A5F]" style={fontSans}>
              {isRTL ? '٠١ — فلسفة المنظومة وميثاق الأمانة' : '01 — FIRM PHILOSOPHY & MANDATE'}
            </span>
          </div>

          <h1
            className="text-4xl sm:text-6xl md:text-7xl text-white font-normal leading-[1.08] tracking-tight"
            style={fontSerif}
          >
            {isRTL ? (
              <>
                الارتقاء بالضيافة. <br />
                <span className="italic" style={{ color: '#E07A5F' }}>هندسة القيمة</span> المؤسسية.
              </>
            ) : (
              <>
                Elevating Hospitality. <br />
                <span className="italic" style={{ color: '#E07A5F' }}>Engineering Value.</span>
              </>
            )}
          </h1>

          <p className="text-base sm:text-lg lg:text-xl leading-relaxed text-slate-300 max-w-3xl mx-auto" style={fontBody}>
            {isRTL
              ? 'صُممت ألتوس استشارات كمنظومة نخبوية متكاملة تسد الفجوة الهيكلية بين العمليات التشغيلية الفندقية التقليدية وذكاء الأعمال الرقمي المتقدم، بقيادة تنفيذية مسؤولة عن النتيجة وليس مجرد التقارير.'
              : 'Altus Advisory was engineered as an elite strategy house closing the structural gap between traditional hospitality operations and advanced AI business intelligence — led by principals accountable for returns, not reports.'}
          </p>
        </FadeInSection>
      </section>

      {/* ═══════════════ SECTION 2: LUXURY EDITORIAL QUOTE BLOCK ═══════════════ */}
      <section className="py-20 px-4 sm:px-6 relative border-y border-white/10" style={{ backgroundColor: '#111419' }}>
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 sm:p-12 rounded-2xl border border-[#C45B2F]/30 bg-white/[0.02] shadow-2xl overflow-hidden">
            <Quote className="absolute -top-4 -start-4 w-28 h-28 text-[#C45B2F]/10 pointer-events-none" />
            
            <div className="relative z-10 space-y-6 text-center">
              <div className="w-12 h-1 bg-[#C45B2F] mx-auto rounded-full" />
              
              <blockquote className="text-xl sm:text-2xl md:text-3xl text-white font-normal leading-relaxed" style={fontSerif}>
                {isRTL ? (
                  <>
                    «لا ننتج تقارير استشارية لتُحفظ على الرفوف؛ بل <span className="italic text-[#E07A5F]">نهندس قدرات تشغيلية</span> ونظم عمل حية تتحول مباشرة إلى عوائد استثمارية للمالك.»
                  </>
                ) : (
                  <>
                    “We do not produce advisory reports for executive shelves; <span className="italic text-[#E07A5F]">we engineer operating capabilities</span> that transfer directly into asset returns.”
                  </>
                )}
              </blockquote>

              <div className="pt-2">
                <div className="text-xs uppercase tracking-[0.25em] font-bold text-[#E07A5F]" style={fontSans}>
                  {isRTL ? 'ميثاق ألتوس الاستشاري' : 'THE ALTUS ADVISORY CREED'}
                </div>
                <div className="text-xs text-slate-400 mt-1" style={fontBody}>
                  {isRTL ? 'المملكة العربية السعودية • الرياض' : 'Kingdom of Saudi Arabia • Riyadh'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 3: THE ALTUS EDGE (6 PILLARS) ═══════════════ */}
      <section id="why-altus" className="py-24 sm:py-32 px-4 sm:px-6 relative" style={{ backgroundColor: COLOR.charcoalDeep }}>
        <FadeInSection className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4 text-[#C45B2F]" style={fontSans}>
              {isRTL ? '٠٣ — ميزة ألتوس التنافسية' : '03 — The Altus Edge'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl text-white font-normal leading-tight" style={fontSans}>
              {isRTL ? (
                <>لماذا <span className="italic" style={{ ...fontSerif, color: '#E07A5F' }}>ألتوس استشارات.</span></>
              ) : (
                <>Why <span className="italic" style={{ ...canela, color: '#E07A5F' }}>Altus Advisory.</span></>
              )}
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mt-5 text-slate-300" style={fontBody}>
              {isRTL
                ? 'يعمل قطاع الاستشارات غالباً بمعزل: العمليات التقليدية من جهة، والتحول الرقمي من جهة أخرى. صُممت ألتوس لسد هذه الفجوة الهيكلية بولاية واحدة متكاملة.'
                : 'The consulting landscape too often operates in silos: traditional operations on one side, digital transformation on the other. Altus was engineered to close that structural gap with a single, integrated mandate.'}
            </p>
          </div>

          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: isRTL ? 'استشارات في صف المالك' : 'Owner-Side Advisory',
                desc: isRTL
                  ? 'إشراف مستقل وحصري لصالح المالك عبر دورة حياة الأصل الكاملة: حماية الميزانيات، حوكمة اتفاقيات الإدارة، وصون مصالح المستثمر من انحراف المشغل والمقاول.'
                  : 'Independent, client-side oversight across the full asset lifecycle: protecting budgets, governing HMAs, and safeguarding investor interests against operator and contractor drift.',
              },
              {
                title: isRTL ? 'عمق بمستوى المشغّل الدولي' : 'Operator-Grade Depth',
                desc: isRTL
                  ? 'قيادة صُقلت داخل كبرى السلاسل العالمية (ماريوت، IHG، ستارووود، أكور). أكثر من 60 عاماً من المسؤولية المباشرة عن الأرباح والخسائر.'
                  : 'Leadership forged inside Marriott, IHG, Starwood, and Accor systems. 60+ combined years of P&L accountability, not theoretical frameworks.',
              },
              {
                title: isRTL ? 'نموذج مزدوج التخصص' : 'A Dual-Discipline Model',
                desc: isRTL
                  ? 'عمليات الضيافة الرفيعة مندمجة مع ذكاء تجاري مدعوم بالذكاء الاصطناعي، لهندسة نمو حقيقي في المجالين في آن واحد.'
                  : 'Elite hospitality operations fused with AI-enabled commercial intelligence, engineering growth across both domains simultaneously.',
              },
              {
                title: isRTL ? 'الأدلة والبيانات قبل الحدس' : 'Evidence over Intuition',
                desc: isRTL
                  ? 'تحليلات تجريبية، نمذجة مالية، وانضباط Six Sigma يحل محل الرأي الشخصي. كل توصية قابلة للقياس والتدقيق.'
                  : 'Empirical analytics, financial modelling, and Six Sigma discipline replace opinion. Every recommendation is measurable and auditable.',
              },
              {
                title: isRTL ? 'فصاحة إقليمية، معايير عالمية' : 'Regional Fluency, Global Standards',
                desc: isRTL
                  ? 'معرفة عميقة الجذور بأسواق السعودية والخليج، وتنفيذ ثنائي اللغة، مع معايير عالمية من الفئة الأولى دون أي تخفيف.'
                  : 'Deep-rooted Saudi and GCC market knowledge, bilingual delivery, and Tier-1 international benchmarks applied without dilution.',
              },
              {
                title: isRTL ? 'شراكة مستدامة' : 'An Enduring Partnership',
                desc: isRTL
                  ? 'توجيه ميداني مباشر من أول مخطط حتى التنفيذ المستدام: علاقة مؤسسية تتجاوز عمر التكليف نفسه.'
                  : 'Hands-on guidance from first blueprint to sustained execution: a relationship that outlives the engagement itself.',
              },
            ].map((edge) => (
              <motion.div
                key={edge.title}
                variants={staggerItem}
                className="p-8 rounded-2xl border border-white/10 hover:border-[#C45B2F]/60 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300 shadow-xl group"
              >
                <div className="w-2 h-2 rounded-full bg-[#C45B2F] mb-4 group-hover:scale-150 transition-transform" />
                <h4 className="text-lg text-white font-bold mb-3" style={fontSans}>{edge.title}</h4>
                <p className="text-sm leading-relaxed text-slate-300" style={fontBody}>{edge.desc}</p>
              </motion.div>
            ))}
          </StaggerChildren>

          <div className="mt-12 p-8 sm:p-10 rounded-2xl border border-[#C45B2F]/40 bg-[#C45B2F]/10 shadow-2xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2 text-[#E07A5F]" style={fontSans}>
              {isRTL ? 'عرض القيمة الفريد' : 'Unique Value Proposition'}
            </div>
            <p className="text-base sm:text-xl leading-relaxed text-white" style={fontSerif}>
              {isRTL
                ? 'تميّز تشغيلي رفيع في الضيافة، مندمج مع ذكاء إيرادي مدعوم بالذكاء الاصطناعي: أثر ملموس عبر وضوح استراتيجي، وانضباط تشغيلي، وابتكار رقمي متواصل.'
                : 'High-level hospitality operational excellence, integrated with AI-driven revenue intelligence: delivering measurable impact through strategic clarity, operational rigour, and continuous digital innovation.'}
            </p>
          </div>
        </FadeInSection>
      </section>

      {/* ═══════════════ SECTION 4: TWO DIVISIONS (PRACTICES) ═══════════════ */}
      <section id="practices" className="py-24 sm:py-32 px-4 sm:px-6 relative" style={{ backgroundColor: COLOR.charcoal }}>
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4 text-[#C45B2F]" style={fontSans}>
              {isRTL ? '٠٤–٠٥ — محفظة الممارسة الاستشارية' : '04–05 — Service Portfolio'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl text-white font-normal leading-tight" style={fontSans}>
              {isRTL ? (
                <>قسمان استشاريان. <span className="italic" style={{ ...fontSerif, color: '#E07A5F' }}>منصة حصريّة واحدة.</span></>
              ) : (
                <>Two divisions. <span className="italic" style={{ ...canela, color: '#E07A5F' }}>One proprietary platform.</span></>
              )}
            </h2>
          </FadeInSection>

          <StaggerChildren className="grid md:grid-cols-2 gap-8">
            {practices.map((pr) => (
              <motion.div
                variants={staggerItem}
                key={pr.id}
                className="p-8 sm:p-10 rounded-2xl border border-white/10 hover:border-[#C45B2F]/60 transition-all duration-300 group relative overflow-hidden flex flex-col shadow-2xl bg-[#141820]"
              >
                <div className="relative z-10 flex-1">
                  <div className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] mb-4 text-[#E07A5F] px-3 py-1 rounded bg-[#C45B2F]/15 border border-[#C45B2F]/30" style={fontSans}>
                    {pr.tag}
                  </div>
                  <h3 className="text-2xl text-white font-bold mb-3" style={fontSans}>{pr.title}</h3>
                  <p className="text-sm leading-relaxed mb-6 text-slate-300" style={fontBody}>{pr.desc}</p>

                  <ul className="space-y-3 mb-8 border-t border-white/10 pt-6">
                    {pr.services.map((s) => (
                      <li key={s} className="text-sm text-slate-200 flex items-start gap-3" style={fontBody}>
                        <span className="mt-1.5 h-2 w-2 rounded-full shrink-0 bg-[#C45B2F]" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={openBriefing}
                    className="text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2 text-[#E07A5F] hover:text-white transition-all duration-150 active:scale-[0.97]"
                    style={fontSans}
                  >
                    <span>{isRTL ? 'طلب إحاطة للخدمة' : 'REQUEST SERVICE BRIEFING'}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>
              </motion.div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ═══════════════ SECTION 5: EXECUTIVE LEADERSHIP PROFILES ═══════════════ */}
      <section id="leadership" className="py-24 sm:py-32 px-4 sm:px-6 relative border-t border-white/10" style={{ backgroundColor: COLOR.charcoalDeep }}>
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="text-center space-y-4 mb-16">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C45B2F]" style={fontSans}>
              {isRTL ? '٠٦ — القيادة والشركاء المؤسسون' : '06 — Executive Leadership'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl text-white font-normal" style={fontSans}>
              {isRTL ? (
                <>أسماء موثوقة. <span className="italic" style={{ ...fontSerif, color: '#E07A5F' }}>حضور ميداني.</span> مسؤولية كاملة.</>
              ) : (
                <>Named. <span className="italic" style={{ ...canela, color: '#E07A5F' }}>Present.</span> Accountable.</>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto" style={fontBody}>
              {isRTL
                ? 'يقود كل مهمة استشارية الشركاء المؤسسون مباشرة، بخبرة تراكمية تزيد عن 60 عاماً داخل كبرى المجموعات الفندقية العالمية.'
                : 'Every advisory engagement is directly orchestrated by principals, backed by 60+ combined years of operating leadership across global hotel powerhouses.'}
            </p>
          </FadeInSection>

          <StaggerChildren className="grid md:grid-cols-2 gap-8 text-start">
            {/* Islam Mahrous Profile Card */}
            <motion.div
              variants={staggerItem}
              className="p-8 sm:p-10 rounded-2xl border border-white/10 hover:border-[#C45B2F]/60 transition-all duration-300 bg-[#12161F] shadow-2xl space-y-6 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <img
                      src="/founder-islam.jpg"
                      alt="Islam Mahrous"
                      className="w-24 h-24 rounded-2xl object-cover object-top border-2 border-[#C45B2F] shadow-lg"
                    />
                    <span className="absolute -bottom-2 -end-2 w-7 h-7 rounded-full bg-[#C45B2F] text-white flex items-center justify-center text-xs font-bold shadow-md">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl text-white font-normal" style={fontSerif}>
                      {isRTL ? 'إسلام محروس' : 'Islam Mahrous'}
                    </h3>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#E07A5F] mt-1" style={fontSans}>
                      {isRTL ? 'مؤسس مشارك: الاستراتيجية التجارية والتحول الرقمي' : 'Co-Founder: Brand, Commercial Strategy & AI Transformation'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-white/5 border border-white/10">Marriott • IHG • Starwood • Accor</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed" style={fontBody}>
                  {isRTL
                    ? 'إسلام هو مبتكر النمو في الشركة وحافتها التقنية المستقبلية: الجسر الحيوي بين نماذج الأعمال التقليدية ومتطلبات العصر الحديث. عبر ثلاثة عقود من القيادة متعددة العلامات مع ماريوت وIHG وستارووود وأكور، وإدارة أصول مستقلة عبر السعودية والخليج ومصر وشمال أفريقيا.'
                    : 'Islam is the firm’s growth innovator and forward-looking technological edge: the vital bridge between traditional business models and modern digital agility. Over three decades of multi-brand leadership across Marriott, IHG, Starwood, and Accor systems in Saudi Arabia and the MENA region.'}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-mono text-[#E07A5F]">P&L Accountability • 30+ Yrs</span>
                <button
                  onClick={openBriefing}
                  className="text-xs font-bold uppercase tracking-wider text-white hover:text-[#E07A5F] transition-all duration-150 active:scale-[0.97] flex items-center gap-1.5"
                  style={fontSans}
                >
                  <span>{isRTL ? 'حجز جلسة' : 'Request Briefing'}</span>
                  <ChevronRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </motion.div>

            {/* Hossam Smadi Profile Card */}
            <motion.div
              variants={staggerItem}
              className="p-8 sm:p-10 rounded-2xl border border-white/10 hover:border-[#C45B2F]/60 transition-all duration-300 bg-[#12161F] shadow-2xl space-y-6 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <img
                      src="/founder-hossam.png"
                      alt="Hossam Smadi"
                      className="w-24 h-24 rounded-2xl object-cover object-top border-2 border-[#C45B2F] shadow-lg"
                    />
                    <span className="absolute -bottom-2 -end-2 w-7 h-7 rounded-full bg-[#C45B2F] text-white flex items-center justify-center text-xs font-bold shadow-md">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl text-white font-normal" style={fontSerif}>
                      {isRTL ? 'حسام صمادي' : 'Hossam Smadi'}
                    </h3>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#E07A5F] mt-1" style={fontSans}>
                      {isRTL ? 'مؤسس مشارك: العمليات الفندقية وإدارة الأصول' : 'Co-Founder: Hospitality Operations & Asset Management'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-white/5 border border-white/10">Operations • HMA Governance • Asset Oversight</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed" style={fontBody}>
                  {isRTL
                    ? 'حسام هو المهندس التشغيلي للشركة. بخبرة عميقة في تعقيدات تشغيل الضيافة الدولية وحوكمة عقود الإدارة الفندقية، يركّز على تحويل الأصول المادية إلى مؤسسات عالية العائد وخالية من العيوب التشغيلية.'
                    : 'Hossam is the firm’s operational architect. With deep expertise in the operational complexities of international hospitality and HMA governance, his focus is converting physical hotel assets into high-yield, operationally flawless institutions.'}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-mono text-[#E07A5F]">Operations Architect • 30+ Yrs</span>
                <button
                  onClick={openBriefing}
                  className="text-xs font-bold uppercase tracking-wider text-white hover:text-[#E07A5F] transition-all duration-150 active:scale-[0.97] flex items-center gap-1.5"
                  style={fontSans}
                >
                  <span>{isRTL ? 'حجز جلسة' : 'Request Briefing'}</span>
                  <ChevronRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </motion.div>
          </StaggerChildren>
        </div>
      </section>

      {/* ═══════════════ SECTION 6: HK&P PROPRIETARY PLATFORM ═══════════════ */}
      <section id="platform" className="py-24 sm:py-32 px-4 sm:px-6 relative" style={{ backgroundColor: COLOR.creamyWhite }}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mb-14">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded bg-[#2E7D5A] text-white" style={fontSans}>
                {isRTL ? 'المنصة الرقمية' : 'PROPRIETARY PLATFORM'}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C45B2F]" style={fontSans}>
                {isRTL ? '٠٧ — معهد المعرفة والأداء' : '07 — Knowledge & Performance System'}
              </span>
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-normal leading-tight text-[#1E2329]" style={fontSans}>
              altus <span className="italic" style={{ ...fontSerif, color: COLOR.emerald }}>{isRTL ? 'للمعرفة وأداء الضيافة' : 'Hospitality Knowledge & Performance'}</span>
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mt-5 text-[#5B6775]" style={fontBody}>
              {isRTL
                ? 'منتج استراتيجي حصري يحوّل ثلاثة عقود من الخبرة الفندقية ومعايير التشغيل إلى نظام رقمي منظم للتعلم وإدارة المعرفة وقياس الأداء، مصمم خصيصاً للفنادق المستقلة والشقق الفندقية والمنشآت في المملكة والمنطقة.'
                : 'A proprietary Altus product converting three decades of hotel operating standards into a structured digital system for learning, SOP governance, and performance measurement — purpose-built for hospitality establishments across Saudi Arabia.'}
            </p>
          </div>

          {/* Five integrated layers */}
          <div className="mb-16">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-[#1E2329]" style={fontSans}>
              {isRTL ? 'خمس طبقات معمارية متكاملة' : 'Five Integrated Architectural Layers'}
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                {
                  n: '01',
                  t: isRTL ? 'المنتج والتجربة' : 'Product & UX',
                  d: isRTL ? 'نطاق واضح وتجربة رقمية متسقة عبر بنية المعلومات والواجهة.' : 'Clear scope and consistent experience across information architecture and UX.',
                },
                {
                  n: '02',
                  t: isRTL ? 'المعرفة والتعلّم' : 'Knowledge & Learning',
                  d: isRTL ? 'بنية معرفية، منهج رئيسي، محرك تعلّم، تقييم واعتماد رسمي.' : 'Knowledge architecture, master curriculum, assessment, and certification engine.',
                },
                {
                  n: '03',
                  t: isRTL ? 'الذكاء والأداء' : 'Intelligence & KPIs',
                  d: isRTL ? 'محرك معرفي، بحث ذكي، مساعد ذكاء اصطناعي، ومؤشرات أداء حية.' : 'Knowledge engine, smart search, governed AI assistant, and live metrics.',
                },
                {
                  n: '04',
                  t: isRTL ? 'العمليات التقنية' : 'Technical Operations',
                  d: isRTL ? 'قاعدة بيانات آمنة، هوية وصلاحيات، تخصيص لكل منشأة وتقارير.' : 'Database, identity & permissions, per-property customisation, admin reporting.',
                },
                {
                  n: '05',
                  t: isRTL ? 'الحوكمة والنمو' : 'Governance & Growth',
                  d: isRTL ? 'أمن وخصوصية، ضبط الإصدارات، خارطة طريق المنتج وقنوات الجوال.' : 'Security and privacy, version control, product roadmap, web and mobile channels.',
                },
              ].map((layer) => (
                <div key={layer.n} className="p-6 rounded-xl border border-[#D9C6A3]/60 bg-white/80 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-2xl font-bold mb-3 text-[#C45B2F]" style={mono}>{layer.n}</div>
                  <h4 className="text-sm font-bold mb-2 text-[#1E2329]" style={fontSans}>{layer.t}</h4>
                  <p className="text-xs leading-relaxed text-[#5B6775]" style={fontBody}>{layer.d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Master curriculum */}
          <div className="mb-12">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-2 text-[#1E2329]" style={fontSans}>
              {isRTL ? 'المنهج الرئيسي: عشرة مجالات مهنية معتمدة' : 'Master Curriculum: Ten Professional Domains'}
            </h3>
            <p className="text-xs mb-6 text-[#5B6775]" style={fontBody}>
              {isRTL
                ? 'نموذج محتوى منظم: المجال المهني ← المسار ← الوحدة التدريبية ← الدرس ← التقييم والشهادة المعتمدة'
                : 'Structured content model: Professional Domain → Track → Module → Lesson → Assessment & Certification'}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {(isRTL
                ? ['أساسيات الفندقة', 'الاستقبال وخدمات النزلاء', 'التدبير المنزلي', 'الأغذية والمشروبات', 'المطبخ وفنون الطهي', 'المبيعات والتسويق', 'إدارة الإيرادات والحجوزات', 'تجربة النزيل الفاخرة', 'الجودة والتدقيق التشغيلي', 'الأمن والسلامة والصحة المهنية']
                : ['Hotel Fundamentals', 'Front Office & Concierge', 'Housekeeping Operations', 'Food & Beverage Service', 'Culinary & Kitchen', 'Sales & Marketing', 'Revenue & Reservations', 'Guest Experience', 'Quality & Operational Audit', 'Safety, Security & Health']
              ).map((d) => (
                <span key={d} className="text-xs px-4 py-2 rounded-lg border border-[#D9C6A3]/80 bg-white text-[#1E2329] font-medium shadow-sm" style={fontSans}>
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 7: INDUSTRIES WE SERVE ═══════════════ */}
      <section id="industries" className="py-24 sm:py-32 px-4 sm:px-6 relative" style={{ backgroundColor: COLOR.charcoal }}>
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4 text-[#C45B2F]" style={fontSans}>
            {isRTL ? '٠٨ — تغطية القطاعات' : '08 — Sector Coverage'}
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl text-white font-normal leading-tight mb-6" style={fontSans}>
            {isRTL ? (
              <>القطاعات <span className="italic" style={{ ...fontSerif, color: '#E07A5F' }}>التي نخدمها.</span></>
            ) : (
              <>Industries <span className="italic" style={{ ...canela, color: '#E07A5F' }}>we serve.</span></>
            )}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mb-14" style={fontBody}>
            {isRTL
              ? 'فلسفة تشغيلية واحدة، مطبقة عبر القطاعات الحيوية التي تقود تحول المملكة، أينما تحدّد الخدمة الرفيعة وأداء الأصل وتجربة النزيل النتيجة الاستثمارية.'
              : 'One operating philosophy, applied across the sectors driving the Kingdom’s transformation, wherever service, asset performance, and guest experience decide the outcome.'}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {(isRTL
              ? ['الفنادق المستقلة والعالمية', 'المنتجعات الفاخرة', 'السياحة والوجهات التراثية', 'التطوير العقاري والضيافة', 'الهيئات والكيانات الحكومية', 'المشاريع متعددة الاستخدام', 'المطاعم والضيافة بالتجزئة', 'الرعاية الصحية الفاخرة', 'الاستثمار والأسهم الخاصة', 'المكاتب العائلية']
              : ['Independent & Global Hotels', 'Luxury Resorts & Spas', 'Tourism & Heritage Destinations', 'Real Estate & Hospitality Assets', 'Government & Development Authorities', 'Mixed-Use Giga Developments', 'Hospitality Retail & F&B', 'Premium Healthcare & Wellness', 'Investment Funds & PE', 'Family Offices']
            ).map((ind) => (
              <span
                key={ind}
                className="text-xs px-5 py-3 rounded-xl border border-white/15 text-slate-300 hover:border-[#C45B2F] hover:text-white transition-all duration-300 font-medium bg-[#16191E] shadow-md"
                style={fontSans}
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

