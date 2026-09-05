import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { EASE_OUT, canela, inter, neueHaas, playfair, COLOR } from './publicConstants';

/* ──────────────────────────── ANIMATION HELPERS ──────────────────────────── */

export function FadeInSection({ children, className = '', delay = 0, y = 12, style }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, transform: `translateY(${y}px)` }}
      animate={isInView
        ? { opacity: 1, transform: 'translateY(0px)' }
        : prefersReducedMotion ? { opacity: 0 } : { opacity: 0, transform: `translateY(${y}px)` }
      }
      transition={{ duration: 0.32, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerChildren({ children, className = '', staggerDelay = 0.04, style }: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: prefersReducedMotion ? 0 : staggerDelay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({ target, suffix = '', duration = 1.5 }: { target: string; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (!isInView || prefersReducedMotion) return;
    const numericStr = target.replace(/[^0-9.]/g, '');
    const numericVal = parseFloat(numericStr);
    if (isNaN(numericVal)) return;
    const prefix = target.substring(0, target.indexOf(numericStr));
    const suffixPart = target.substring(target.indexOf(numericStr) + numericStr.length);
    const isDecimal = numericStr.includes('.');
    const startTime = performance.now();
    const durationMs = duration * 1000;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = eased * numericVal;
      const formatted = isDecimal ? current.toFixed(1) : Math.round(current).toString();
      setDisplay(`${prefix}${formatted}${suffixPart}`);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [isInView, prefersReducedMotion, target, duration]);

  return <span ref={ref}>{display}</span>;
}

/* ──────────────────────────── DECORATIVE SVG ──────────────────────────── */

export function CopperDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <div className="h-px w-8 bg-[#C45B2F]/30" />
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#C45B2F]/70">
        <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z" fill="currentColor" />
      </svg>
      <div className="h-px w-8 bg-[#C45B2F]/30" />
    </div>
  );
}

export const GoldDivider = CopperDivider;

/* ──────────────────────────── BRIEFING DIALOG ──────────────────────────── */

interface BriefingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BriefingDialog({ open, onOpenChange }: BriefingDialogProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    mandateType: 'Hospitality Solutions',
    notes: '',
  });

  const mandateOptions = [
    { id: 'Hospitality Solutions', labelEn: 'Hospitality Solutions', labelAr: 'حلول الضيافة والأصول' },
    { id: 'Business Growth & AI', labelEn: 'Business Growth & AI', labelAr: 'نمو الأعمال والذكاء الاصطناعي' },
    { id: 'Asset Management & HMAs', labelEn: 'Asset Management & HMAs', labelAr: 'إدارة الأصول واتفاقيات الإدارة' },
    { id: 'HK&P Digital Platform', labelEn: 'HK&P Platform License', labelAr: 'ترخيص منصة HK&P الرقمية' },
  ];

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const name = form.name.trim();
    const email = form.email.trim();
    if (!name || !email) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('partner_briefing_requests').insert({
        name,
        email,
        phone: form.phone.trim() || null,
        organization: form.organization.trim() || null,
        mandate_type: form.mandateType || null,
        message: form.notes.trim() || null,
      });

      if (error) throw error;

      toast.success(
        isRTL
          ? 'تم استلام طلب الإحاطة بنجاح. سيتواصل معك أحد الشركاء التنفيذيين خلال يومي عمل وبسرية تامة.'
          : 'Briefing request received. A partner will respond directly within two business days under strict confidence.'
      );
      onOpenChange(false);
      setForm({ name: '', email: '', phone: '', organization: '', mandateType: 'Hospitality Solutions', notes: '' });
    } catch (err) {
      console.error('Failed to submit partner briefing request:', err);
      toast.error(
        isRTL
          ? 'تعذر إرسال الطلب. يرجى المحاولة مرة أخرى أو الاتصال بنا مباشرة.'
          : 'We couldn\'t submit your request. Please try again or contact us directly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [form, isSubmitting, isRTL, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <span className="hidden" />
      </DialogTrigger>
      <DialogContent
        className="bg-[#0F131A] border border-[#C45B2F]/40 text-white max-w-xl rounded-2xl p-0 overflow-hidden shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(196,91,47,0.15)]"
        style={inter}
      >
        {/* Metallic Copper Top Accent Ribbon */}
        <div className="h-2 bg-gradient-to-r from-[#C45B2F] via-[#E07A5F] to-[#D9C6A3]" />

        <div className="p-6 sm:p-8">
          <DialogHeader className="text-start space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#C45B2F] px-2.5 py-1 rounded bg-[#C45B2F]/10 border border-[#C45B2F]/30" style={neueHaas}>
                {isRTL ? 'إحاطة شريك تنفيذي' : 'EXECUTIVE PARTNER BRIEFING'}
              </span>
            </div>
            <DialogTitle className="text-2xl sm:text-3xl text-white font-normal leading-tight" style={canela}>
              {isRTL ? (
                <>طلب إحاطة <span className="italic text-[#E07A5F]">شريك تنفيذي</span></>
              ) : (
                <>Request a <span className="italic text-[#E07A5F]">Partner Briefing</span></>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs sm:text-sm leading-relaxed" style={inter}>
              {isRTL
                ? 'تُعالج جميع الاستفسارات بسرية تامة تحت معيار أمانة العميل. سيتواصل معك أحد الشركاء مباشرة.'
                : 'All inquiries are received in strict confidence under our fiduciary client mandate. A partner will respond directly.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 mt-6 text-start">
            {/* Mandate Type Chips */}
            <div>
              <Label className="text-xs font-semibold text-slate-300 block mb-2" style={neueHaas}>
                {isRTL ? 'نوع الاستشارة والمهمة المطلوبة' : 'Primary Advisory Mandate'}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {mandateOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setForm({ ...form, mandateType: opt.id })}
                    className={`px-3 py-2 text-xs rounded-lg border text-start transition-all ${
                      form.mandateType === opt.id
                        ? 'border-[#C45B2F] bg-[#C45B2F]/15 text-white font-semibold'
                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                    }`}
                  >
                    {isRTL ? opt.labelAr : opt.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <Label className="text-xs font-semibold text-slate-300" style={neueHaas}>
                {isRTL ? 'الاسم الكامل *' : 'Full Name *'}
              </Label>
              <Input
                required
                disabled={isSubmitting}
                placeholder={isRTL ? 'مثال: عبد المحسن السعد' : 'e.g. Sultan Al-Rashid'}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-[#080B10] border-white/15 text-white mt-1.5 focus:border-[#C45B2F] focus:ring-1 focus:ring-[#C45B2F] rounded-xl h-11"
              />
            </div>

            {/* Email & Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-300" style={neueHaas}>
                  {isRTL ? 'البريد المؤسسي *' : 'Corporate Email *'}
                </Label>
                <Input
                  required
                  disabled={isSubmitting}
                  type="email"
                  placeholder="name@company.sa"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-[#080B10] border-white/15 text-white mt-1.5 focus:border-[#C45B2F] focus:ring-1 focus:ring-[#C45B2F] rounded-xl h-11"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-300" style={neueHaas}>
                  {isRTL ? 'رقم الهاتف' : 'Phone Number'}
                </Label>
                <Input
                  disabled={isSubmitting}
                  placeholder="+966 50 000 0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-[#080B10] border-white/15 text-white mt-1.5 focus:border-[#C45B2F] focus:ring-1 focus:ring-[#C45B2F] rounded-xl h-11"
                />
              </div>
            </div>

            {/* Organization / Asset */}
            <div>
              <Label className="text-xs font-semibold text-slate-300" style={neueHaas}>
                {isRTL ? 'اسم الشركة / الأصل الفندقي' : 'Organization / Asset Name'}
              </Label>
              <Input
                disabled={isSubmitting}
                placeholder={isRTL ? 'شركة الضيافة والأصول الفندقية' : 'Hospitality Holding / Asset Co.'}
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                className="bg-[#080B10] border-white/15 text-white mt-1.5 focus:border-[#C45B2F] focus:ring-1 focus:ring-[#C45B2F] rounded-xl h-11"
              />
            </div>

            {/* Mandate Notes */}
            <div>
              <Label className="text-xs font-semibold text-slate-300" style={neueHaas}>
                {isRTL ? 'نبذة عن نطاق المهمة' : 'Mandate Scope & Objectives'}
              </Label>
              <Textarea
                rows={3}
                disabled={isSubmitting}
                placeholder={isRTL ? 'صف النطاق التشغيلي، الجدوى، أو التحول المطلوب...' : 'Briefly outline the operational challenge or advisory objectives...'}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="bg-[#080B10] border-white/15 text-white mt-1.5 focus:border-[#C45B2F] focus:ring-1 focus:ring-[#C45B2F] rounded-xl resize-none"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-to-r from-[#C45B2F] via-[#D96B3D] to-[#B34D24] hover:from-[#D96B3D] hover:to-[#C45B2F] text-white font-bold text-xs uppercase tracking-[0.2em] mt-3 rounded-xl shadow-lg shadow-[#C45B2F]/30 disabled:opacity-60 transition-all"
              style={neueHaas}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="me-2 h-4 w-4 animate-spin" />
                  <span>{isRTL ? 'جاري الإرسال...' : 'Submitting Request...'}</span>
                </>
              ) : (
                <>
                  <Send className="me-2 h-4 w-4" />
                  <span>{isRTL ? 'إرسال طلب الإحاطة السري' : 'Submit Confidential Inquiry'}</span>
                </>
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

