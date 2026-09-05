import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COLOR, cairo, canela, inter, mono, neueHaas } from './publicConstants';

export default function VisionPage() {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

  useEffect(() => {
    const handleLangChange = (lng: string) => setCurrentLang(lng);
    i18n.on('languageChanged', handleLangChange);
    return () => i18n.off('languageChanged', handleLangChange);
  }, [i18n]);

  const isRTL = currentLang === 'ar' || currentLang.startsWith('ar') || i18n.dir() === 'rtl';

  const fontSans = isRTL ? cairo : neueHaas;
  const fontSerif = isRTL ? cairo : canela;
  const fontBody = isRTL ? cairo : inter;

  return (
    <div className="flex flex-col pt-20" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ═══════════════ SAUDI VISION 2030 ═══════════════ */}
      <section id="vision2030" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.charcoal }}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-14">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...fontSans, color: COLOR.copper }}>
              {isRTL ? '12 — التوافق الوطني' : '12 — National Alignment'}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl text-white font-normal leading-tight" style={fontSans}>
              {isRTL ? (
                <>مهندسة لخدمة <span className="italic" style={{ ...fontSerif, color: COLOR.copper }}>رؤية السعودية 2030.</span></>
              ) : (
                <>Engineered for <span className="italic" style={{ ...fontSerif, color: COLOR.copper }}>Saudi Vision 2030.</span></>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mt-5" style={{ ...fontBody, color: '#94A3B8' }}>
              {isRTL
                ? 'رؤية 2030 ليست مخططاً للمستقبل، بل تحوّل حي وعالمي النطاق. عملت ألتوس استشارات على مواءمة رسالتها وبنية خدماتها مع الركائز الأساسية للمملكة.'
                : 'Vision 2030 is not a blueprint of the future. It is a live, global-scale transformation. Altus Advisory has aligned its mission and service architecture to directly support the Kingdom’s core pillars.'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                p: isRTL ? 'الركيزة الأولى' : 'Pillar I',
                t: isRTL ? 'تعزيز طفرة السياحة والضيافة' : 'Powering the Tourism & Hospitality Surge',
                d: isRTL
                  ? 'مع استهداف المملكة 150 مليون زيارة سنوياً بحلول 2030، نعمل كأمناء استراتيجيين للمطورين والمستثمرين: تمثيل المالك، التحقق من الجدوى، والتحسين التشغيلي.'
                  : 'With the Kingdom targeting 150 million annual visits by 2030, we act as strategic fiduciary to developers and investors: owner representation, feasibility validation, and operational optimisation.',
              },
              {
                p: isRTL ? 'الركيزة الثانية' : 'Pillar II',
                t: isRTL ? 'تطوير الريادة الرقمية والذكاء الاصطناعي' : 'Advancing Digital & AI Leadership',
                d: isRTL
                  ? 'دعم مجتمع رقمي واقتصاد موجّه للتقنية: تسعير ديناميكي مدعوم بالذكاء الاصطناعي، إدارة إيراد تنبؤية، وتسويق رقمي متقدم.'
                  : 'Supporting a digitally enabled society and tech-forward economy: AI-based dynamic pricing, predictive revenue management, and advanced digital marketing.',
              },
              {
                p: isRTL ? 'الركيزة الثالثة' : 'Pillar III',
                t: isRTL ? 'تمكين الكوادر السعودية' : 'Empowering Saudi Human Capital',
                d: isRTL
                  ? 'انسجاماً مع أهداف السعودة وتمكين الشباب، نقدّم تدريباً تنفيذياً، أطر كفاءة قيادية، وبرامج نقل معرفة تبني جيلاً من الكوادر السعودية.'
                  : 'In step with Saudization and youth-empowerment goals, our executive coaching, leadership-competency frameworks, and knowledge-transfer programmes build a globally competitive class of Saudi executives.',
              },
              {
                p: isRTL ? 'الركيزة الرابعة' : 'Pillar IV',
                t: isRTL ? 'تمكين المنشآت الصغيرة والمتوسطة ورواد الأعمال الجريئين' : 'Enabling SMEs, Start-ups & Bold Entrepreneurs',
                d: isRTL
                  ? 'تُعطي رؤية 2030 أولوية لمساهمة المنشآت الصغيرة والمتوسطة في الناتج المحلي. نجلب معايير استشارية من الفئة الأولى إلى الشركات الناشئة السعودية.'
                  : 'Vision 2030 prioritises SME contribution to GDP. We bring Tier-1 consulting standards, typically reserved for conglomerates, to Saudi start-ups and scale-ups.',
              },
            ].map((pillar) => (
              <div key={pillar.p} className="p-8 sm:p-9 border border-white/10" style={{ backgroundColor: COLOR.charcoalDeep }}>
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3" style={{ ...fontSans, color: COLOR.copper }}>{pillar.p}</div>
                <h4 className="text-lg sm:text-xl text-white font-medium mb-3" style={fontSans}>{pillar.t}</h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed" style={{ ...fontBody, color: '#94A3B8' }}>{pillar.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ MARKET OPPORTUNITY ═══════════════ */}
      <section id="market" className="py-24 sm:py-32 px-4 relative" style={{ backgroundColor: COLOR.creamyWhite }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-12 items-start mb-14">
            <div className="lg:col-span-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ ...fontSans, color: COLOR.copper }}>
                {isRTL ? '13 — مسار النمو السعودي' : '13 — The Saudi Growth Runway'}
              </div>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-normal leading-tight" style={{ ...fontSans, color: COLOR.charcoal }}>
                {isRTL ? (
                  <>فرصة <span className="italic" style={{ ...fontSerif, color: COLOR.emerald }}>السوق.</span></>
                ) : (
                  <>Market <span className="italic" style={{ ...fontSerif, color: COLOR.emerald }}>Opportunity.</span></>
                )}
              </h2>
              <p className="text-sm sm:text-base leading-relaxed mt-5" style={{ ...fontBody, color: COLOR.slate }}>
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
                <div className="text-[11px] leading-snug font-medium mt-2" style={{ ...fontSans, color: COLOR.slate }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Visitor trajectory bar chart */}
          <div className="mb-16">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ ...fontSans, color: COLOR.charcoal }}>
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
                  <div className="text-xs font-medium" style={{ ...fontSans, color: COLOR.slate }}>{bar.target ? (isRTL ? 'هدف 2030' : '2030 Target') : bar.y}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
