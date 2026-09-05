import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBriefing } from './PublicLayout';
import { FadeInSection, StaggerChildren } from './publicComponents';
import { COLOR, cairo, canela, inter, neueHaas, staggerItem } from './publicConstants';

export default function LeadershipPage() {
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

  return (
    <div className="flex flex-col pt-20" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ═══════════════ EXECUTIVE LEADERSHIP ═══════════════ */}
      <section id="leadership" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.charcoal }}>
        <FadeInSection className="max-w-5xl mx-auto text-center space-y-4 mb-14">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ ...fontSans, color: COLOR.copper }}>
            {isRTL ? '١٦–١٧ — القيادة التنفيذية' : '16–17 — Executive Leadership'}
          </div>
          <h2
            className="text-3xl sm:text-5xl md:text-6xl text-white font-normal"
            style={fontSans}
          >
            {isRTL ? (
              <>حاضرون. <span className="italic" style={{ ...fontSerif, color: COLOR.copper }}>معروفون.</span> مسؤولون.</>
            ) : (
              <>Named. <span className="italic" style={{ ...canela, color: COLOR.copper }}>Present.</span> Accountable.</>
            )}
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
                  <h3 className="text-xl text-white font-medium" style={fontSerif}>
                    {isRTL ? 'إسلام محروس' : 'Islam Mahrous'}
                  </h3>
                  <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ ...fontSans, color: COLOR.copper }}>
                    {isRTL ? 'مؤسس مشارك: العلامة، الاستراتيجية التجارية، والتحول الرقمي' : 'Co-Founder: Brand, Commercial Strategy & AI-Driven Digital Transformation'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed" style={{ ...fontBody, color: '#94A3B8' }}>
                {isRTL
                  ? 'إسلام هو مبتكر النمو في الشركة وحافتها التقنية المستقبلية: الجسر الحيوي بين نماذج الأعمال التقليدية ومتطلبات العصر الحديث. عبر ثلاثة عقود من القيادة متعددة العلامات مع ماريوت وIHG وستارووود وأكور، وإدارة أصول مستقلة عبر السعودية والخليج ومصر وشمال أفريقيا.'
                  : 'Islam is the firm’s growth innovator and its forward-looking technological edge: the vital bridge between traditional business models and the demands of the modern era. Across three decades of multi-brand leadership with Marriott, IHG, Starwood, and Accor, and independent asset management across Saudi Arabia, the GCC, Egypt, and North Africa.'}
              </p>
            </motion.div>

            {/* Hossam Smadi */}
            <motion.div variants={staggerItem} className="p-8 sm:p-10 border border-white/10 space-y-6" style={{ backgroundColor: COLOR.charcoalDeep }}>
              <div className="flex items-center gap-5">
                <img
                  src="/founder-hossam.png"
                  alt="Hossam Smadi"
                  className="w-20 h-20 rounded-full object-cover object-top border-2"
                  style={{ borderColor: COLOR.copper }}
                />
                <div>
                  <h3 className="text-xl text-white font-medium" style={fontSerif}>
                    {isRTL ? 'حسام صمادي' : 'Hossam Smadi'}
                  </h3>
                  <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ ...fontSans, color: COLOR.copper }}>
                    {isRTL ? 'مؤسس مشارك: عمليات الضيافة وإدارة الأصول' : 'Co-Founder: Hospitality Operations & Asset Management'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed" style={{ ...fontBody, color: '#94A3B8' }}>
                {isRTL
                  ? 'حسام هو المهندس التشغيلي للشركة. بخبرة عميقة في تعقيدات تشغيل الضيافة الدولية، يركّز على تحويل الأصول المادية إلى مؤسسات عالية العائد وخالية من العيوب التشغيلية.'
                  : 'Hossam is the firm’s operational architect. With deep expertise in the operating complexities of international hospitality, his focus is converting physical assets into high-yield, operationally flawless institutions.'}
              </p>
            </motion.div>
          </div>

          <div className="text-center mt-10">
            <button
              onClick={openBriefing}
              className="text-[11px] font-semibold tracking-[0.15em] uppercase flex items-center gap-2 mx-auto transition-all duration-150 active:scale-[0.97] hover:opacity-80"
              style={{ ...fontSans, color: COLOR.copper }}
            >
              <span>{isRTL ? 'تعرف على الشركاء' : 'MEET THE FIRM'}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>
        </StaggerChildren>
      </section>

      {/* ═══════════════ STRATEGIC PARTNERSHIPS ═══════════════ */}
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
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                t: isRTL ? 'المشغّلون الفندقيون والعلامات العالمية' : 'Hotel Operators & Global Brands',
                d: isRTL ? 'علاقات عمل عبر أنظمة تشغيل دولية: تمكّن من تفاوض مستنير على اتفاقيات الإدارة.' : 'Working relationships across international operating systems: enabling informed HMA negotiation.',
              },
              {
                t: isRTL ? 'المستثمرون العالميون والصناديق والمكاتب العائلية' : 'Global Investors, Funds & Family Offices',
                d: isRTL ? 'مواءمة استشارية مع المستثمرين المؤسسيين والمطورين والمكاتب العائلية.' : 'Advisory alignment with institutional investors, developers, and family offices.',
              },
              {
                t: isRTL ? 'شركاء التقنية والبيانات' : 'Technology & Data Partners',
                d: isRTL ? 'شبكة مُدقَّقة من مزودي أنظمة إدارة الممتلكات وإدارة الإيرادات وذكاء الأعمال.' : 'A vetted bench of PMS, revenue-management, BI, and AI solution providers.',
              },
              {
                t: isRTL ? 'الحكومة وهيئات التطوير' : 'Government & Development Authorities',
                d: isRTL ? 'تعامل بنّاء مع الوزارات وهيئات الوجهات وكيانات المشاريع العملاقة.' : 'Constructive engagement with ministries, destination authorities, and giga-project entities.',
              },
            ].map((p) => (
              <div key={p.t} className="p-8 border" style={{ backgroundColor: COLOR.ivory, borderColor: COLOR.sand }}>
                <h4 className="text-base font-bold mb-2.5" style={{ ...neueHaas, color: COLOR.charcoal }}>{p.t}</h4>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ ...inter, color: COLOR.slate }}>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ OUR VALUES ═══════════════ */}
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
          </FadeInSection>

          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            {[
              { t: isRTL ? 'النزاهة' : 'Integrity', d: isRTL ? 'نتصرف كأمناء حقيقيين على أصول العميل.' : 'We act as true fiduciaries of client assets.' },
              { t: isRTL ? 'التميّز' : 'Excellence', d: isRTL ? 'معايير لا تقبل التنازل.' : 'Uncompromising standards.' },
              { t: isRTL ? 'الابتكار' : 'Innovation', d: isRTL ? 'سعي حثيث نحو الاضطراب الرقمي.' : 'Agile pursuit of digital disruption.' },
              { t: isRTL ? 'الضيافة' : 'Hospitality', d: isRTL ? 'الخدمة هي لغتنا الأم.' : 'Service is our native language.' },
            ].map((v) => (
              <div key={v.t} className="p-7 hover:bg-white/[0.03] transition-colors duration-300" style={{ backgroundColor: COLOR.charcoalDeep }}>
                <h4 className="text-sm font-bold uppercase tracking-wide mb-2.5" style={{ ...neueHaas, color: COLOR.copper }}>{v.t}</h4>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-300" style={{ ...inter, color: '#94A3B8' }}>{v.d}</p>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ═══════════════ ESG & SUSTAINABILITY ═══════════════ */}
      <section id="esg" className="py-24 sm:py-32 px-4 relative overflow-hidden" style={{ backgroundColor: COLOR.creamyWhite }}>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="max-w-2xl mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...neueHaas, color: COLOR.emerald }}>
              {isRTL ? '20 — أداء مسؤول' : '20 — Responsible Performance'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-normal leading-tight" style={{ ...neueHaas, color: COLOR.charcoal }}>
              ESG &amp; <span className="italic" style={{ ...canela, color: COLOR.emerald }}>{isRTL ? 'الاستدامة' : 'Sustainability'}</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { t: isRTL ? 'الحوكمة' : 'Governance', d: isRTL ? 'تقارير شفافة للمالك، نزاهة اتفاقيات الإدارة والمشتريات.' : 'Transparent owner reporting, HMA and procurement integrity.' },
              { t: isRTL ? 'السياحة المسؤولة' : 'Responsible Tourism', d: isRTL ? 'رعاية الوجهات بما يتوافق مع أجندة السياحة التجديدية.' : 'Destination stewardship aligned with Vision 2030’s regenerative tourism.' },
              { t: isRTL ? 'المجتمع والأفراد' : 'Community & People', d: isRTL ? 'استراتيجيات كوادر تُركّز على السعودة.' : 'Saudization-first talent strategies and local supplier development.' },
              { t: isRTL ? 'الاستدامة التشغيلية' : 'Operational Sustainability', d: isRTL ? 'كفاءة الطاقة والمياه والنفايات مُهندسة داخل إجراءات التشغيل.' : 'Energy, water, and waste efficiency engineered into SOPs and capex plans.' },
            ].map((e) => (
              <div key={e.t} className="p-8 border" style={{ backgroundColor: COLOR.ivory, borderColor: COLOR.sand }}>
                <h4 className="text-base font-bold mb-2.5" style={{ ...neueHaas, color: COLOR.charcoal }}>{e.t}</h4>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ ...inter, color: COLOR.slate }}>{e.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
