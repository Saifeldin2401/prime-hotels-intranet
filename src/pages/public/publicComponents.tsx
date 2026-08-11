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
      transition={{ duration: 0.5, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerChildren({ children, className = '', staggerDelay = 0.05, style }: {
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
          ? 'تم استلام طلب الإحاطة بنجاح. سيتواصل معك أحد الشركاء خلال يومي عمل.'
          : 'Briefing request received. A partner will respond directly within two business days.'
      );
      onOpenChange(false);
      setForm({ name: '', email: '', phone: '', organization: '', mandateType: 'Hospitality Solutions', notes: '' });
    } catch (err) {
      console.error('Failed to submit partner briefing request:', err);
      toast.error(
        isRTL
          ? 'تعذر إرسال الطلب. يرجى المحاولة مرة أخرى.'
          : 'We couldn\'t submit your request. Please try again.'
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
      <DialogContent className="bg-[#09101F] border border-amber-500/30 text-white max-w-lg rounded-none p-6 sm:p-8" style={inter}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-amber-400" style={playfair}>
            {isRTL ? 'طلب إحاطة شريك متقدم' : 'Request Partner Briefing'}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs mt-1">
            {isRTL
              ? 'تُعالج جميع الاستفسارات بسرية تامة. سيتواصل معك أحد الشركاء خلال يومي عمل.'
              : 'All inquiries are received in strict confidence. A partner will respond directly within two business days.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 mt-4 text-start">
          <div>
            <Label className="text-xs font-semibold text-slate-300">{isRTL ? 'الاسم الكامل' : 'Full Name'}</Label>
            <Input required disabled={isSubmitting} placeholder={isRTL ? 'مثال: عبد المحسن السعد' : 'e.g. Sultan Al-Rashid'} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[#050A12] border-slate-800 text-white mt-1 focus:border-amber-500 rounded-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-slate-300">{isRTL ? 'البريد الإلكتروني' : 'Corporate Email'}</Label>
              <Input required disabled={isSubmitting} type="email" placeholder="name@company.sa" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-[#050A12] border-slate-800 text-white mt-1 focus:border-amber-500 rounded-none" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-300">{isRTL ? 'رقم الهاتف' : 'Phone Number'}</Label>
              <Input disabled={isSubmitting} placeholder="+966 50 000 0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-[#050A12] border-slate-800 text-white mt-1 focus:border-amber-500 rounded-none" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-300">{isRTL ? 'اسم الشركة / الأصل' : 'Organization / Asset'}</Label>
            <Input disabled={isSubmitting} placeholder={isRTL ? 'شركة الفنادق والضيافة' : 'Hospitality Group / Asset Co.'} value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="bg-[#050A12] border-slate-800 text-white mt-1 focus:border-amber-500 rounded-none" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-300">{isRTL ? 'تفاصيل المهمة والاستشارة' : 'Mandate Overview'}</Label>
            <Textarea rows={3} disabled={isSubmitting} placeholder={isRTL ? 'صف النطاق التشغيلي أو الاستثماري المطلوب...' : 'Briefly describe your operational or advisory mandate...'} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-[#050A12] border-slate-800 text-white mt-1 focus:border-amber-500 rounded-none" />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider mt-2 rounded-none disabled:opacity-60">
            {isSubmitting ? (
              <RefreshCw className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="me-2 h-4 w-4" />
            )}
            {isRTL ? 'إرسال طلب الإحاطة' : 'Submit Confidential Inquiry'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
