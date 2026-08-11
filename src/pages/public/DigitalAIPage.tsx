import { Button } from '@/components/ui/button';
import { Check, Lock, ShieldCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useBriefing } from './PublicLayout';
import { FadeInSection, StaggerChildren } from './publicComponents';
import { COLOR, canela, inter, neueHaas } from './publicConstants';

export default function DigitalAIPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const navigate = useNavigate();
  const { openBriefing } = useBriefing();

  return (
    <div className="flex flex-col pt-20">
      {/* ═══════════════ DIGITAL & AI ═══════════════ */}
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
                d: isRTL ? 'مصدر موحّد للحقيقة عبر بيانات PMS وPOS والقنوات والبيانات المالية.' : 'A single source of truth across PMS, POS, channel, and financial data.',
              },
              {
                t: isRTL ? 'لوحات تنفيذية' : 'Executive Dashboards',
                d: isRTL ? 'لوحات بمستوى المالك ومجلس الإدارة: RevPAR، GOPPAR، والحجوزات القادمة.' : 'Owner- and board-grade dashboards: RevPAR, GOPPAR, pickup, and sentiment.',
              },
              {
                t: isRTL ? 'ذكاء اصطناعي تطبيقي' : 'Applied AI',
                d: isRTL ? 'مصفوفات تسعير ديناميكي، إدارة عائد تنبؤية، وتوقّع الطلب.' : 'Dynamic pricing matrices, predictive yield management, demand forecasting.',
              },
              {
                t: isRTL ? 'تحليلات متقدمة' : 'Advanced Analytics',
                d: isRTL ? 'اقتصاديات القنوات، تحليل مشاعر النزلاء، وتحليل محركات التكلفة.' : 'Channel economics, guest-sentiment mining, cost-driver analysis.',
              },
              {
                t: isRTL ? 'مراقبة الأداء' : 'Performance Monitoring',
                d: isRTL ? 'قياس مستمر لمؤشرات الأداء مع التنبيه: تظهر الانحرافات خلال أيام.' : 'Continuous KPI instrumentation with alerting: variances surfaced in days.',
              },
              {
                t: isRTL ? 'التحول الرقمي' : 'Digital Transformation',
                d: isRTL ? 'بنية CRM، الانتقال إلى السحابة، ومخططات تقنية متكاملة.' : 'CRM architecture, cloud migration, and integrated technology blueprints.',
              },
            ].map((d) => (
              <div key={d.t} className="p-7 hover:bg-white/[0.03] transition-colors duration-300" style={{ backgroundColor: COLOR.charcoalDeep }}>
                <h4 className="text-sm font-bold uppercase tracking-wide mb-2.5" style={{ ...neueHaas, color: COLOR.copper }}>{d.t}</h4>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-300" style={{ ...inter, color: '#94A3B8' }}>{d.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ WHY CLIENTS CHOOSE ALTUS ═══════════════ */}
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
                    d: isRTL ? 'التمكين الرقمي' : 'Digital enablement',
                    a: isRTL ? 'تنتهي النصيحة عند التقرير' : 'Advice ends at the report',
                    c: isRTL ? 'altus HK&P: منصة تعلّم وأداء حصرية تعيش داخل مؤسسة العميل' : 'altus Hospitality Knowledge & Performance: a proprietary learning and performance platform that lives on inside the client',
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
        </div>
      </section>

      {/* ═══════════════ THE ALTUS PORTAL ═══════════════ */}
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
                ? 'هذا الموقع هو أيضاً بوابتك: مساحة عمل آمنة لفرق ألتوس، والمنشآت الشريكة، وموظفي الخط الأمامي.'
                : 'This site is also your gateway: a secure workspace for Altus teams, partner properties, and front-line staff.'}
            </p>

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
            <Button
              onClick={openBriefing}
              variant="outline"
              className="w-full h-11 rounded-none border bg-transparent text-xs font-bold tracking-[0.15em] uppercase transition-[background-color] duration-200 hover:bg-amber-600/10"
              style={{ borderColor: COLOR.copper, color: COLOR.copper }}
            >
              {isRTL ? 'طلب إحاطة شريك' : 'REQUEST A BRIEFING'}
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <section className="relative py-32 sm:py-40 px-4 text-center overflow-hidden" style={{ backgroundColor: COLOR.charcoalDeep }}>
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

          <div className="pt-4" style={neueHaas}>
            <Button
              size="lg"
              onClick={openBriefing}
              className="h-12 px-8 rounded-none text-xs font-bold tracking-[0.2em] uppercase text-white shadow-lg transition-opacity duration-200 hover:opacity-90"
              style={{ background: COLOR.copper }}
            >
              {isRTL ? 'طلب إحاطة شريك' : 'REQUEST A BRIEFING'}
            </Button>
          </div>
        </FadeInSection>
      </section>
    </div>
  );
}
