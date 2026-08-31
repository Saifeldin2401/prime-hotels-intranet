import { LoginForm } from '@/components/auth/LoginForm';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Lock, ShieldCheck, Sparkles, UserCheck, Users, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { canela, inter, mono, neueHaas } from './public/publicConstants';

// Animated ambient background particles
function Particle({ delay, x, y, size }: { delay: number; x: string; y: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-[#C45B2F]/30 blur-[1px]"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.7, 0],
        scale: [0, 1.2, 0],
        y: [0, -80, -160],
      }}
      transition={{
        duration: 9,
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  );
}

// Feature Card tailored for staff and internal employee operations
function FeatureCard({
  icon: Icon,
  title,
  subtitle,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group p-5 rounded-2xl border border-white/10 hover:border-[#C45B2F]/60 bg-[#12161F]/80 backdrop-blur-xl transition-all duration-300 shadow-2xl flex flex-col justify-between h-38"
    >
      <div className="w-11 h-11 rounded-xl border border-[#C45B2F]/40 bg-[#C45B2F]/10 flex items-center justify-center text-[#E07A5F] shadow-inner group-hover:scale-105 transition-transform">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-1" style={neueHaas}>{title}</h4>
        <p className="text-[11px] text-slate-300 font-normal leading-relaxed" style={inter}>{subtitle}</p>
      </div>
    </motion.div>
  );
}

export default function Login() {
  const { t, i18n } = useTranslation('auth');
  const year = new Date().getFullYear();
  const isRTL = i18n.dir() === 'rtl';
  const prefersReducedMotion = useReducedMotion();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Mouse movement parallax effect
  useEffect(() => {
    if (prefersReducedMotion) return;

    let frame = 0;
    const handleMouseMove = (e: MouseEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setMousePosition({
          x: (e.clientX / window.innerWidth - 0.5) * 12,
          y: (e.clientY / window.innerHeight - 0.5) * 12,
        });
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [prefersReducedMotion]);

  // Particles generator
  const particles = useMemo(
    () =>
      prefersReducedMotion
        ? []
        : Array.from({ length: 6 }, (_, i) => ({
            id: i,
            delay: i * 1.2,
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            size: Math.random() * 5 + 3,
          })),
    [prefersReducedMotion]
  );

  return (
    <div className="min-h-screen grid lg:grid-cols-12 overflow-hidden bg-[#0A0D12] font-sans text-slate-100 relative selection:bg-[#C45B2F]/30 selection:text-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background Photography Layer */}
      <motion.div
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 25, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
        className="absolute inset-0 bg-cover bg-center opacity-35 pointer-events-none"
        style={{
          backgroundImage: "url('/hero-resort.png')",
        }}
      />

      {/* Dark Vignette Overlay for Crisp Readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0D12]/95 via-[#0A0D12]/85 to-[#0A0D12]/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D12] via-transparent to-[#0A0D12]/70" />

      {/* Parallax Ambient Orbs */}
      <motion.div
        animate={{
          x: mousePosition.x * 2,
          y: mousePosition.y * 2,
        }}
        transition={{ type: 'spring', stiffness: 40, damping: 25 }}
        className="absolute top-1/3 start-1/4 w-[450px] h-[450px] bg-[#C45B2F]/15 rounded-full blur-[140px] pointer-events-none"
      />

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <Particle key={p.id} {...p} />
        ))}
      </div>

      {/* Top Right Language Switcher */}
      <div className="absolute top-5 end-6 lg:top-8 lg:end-10 z-40">
        <LanguageSwitcher
          variant="outline"
          className="bg-[#12161F]/90 border-white/15 text-white hover:bg-white/10 rounded-full px-4 py-2 text-xs backdrop-blur-md shadow-xl transition-all"
        />
      </div>

      {/* Top Left Branding Logo */}
      <div className="absolute top-6 start-6 lg:top-8 lg:start-10 z-30 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="flex items-center gap-3 group"
        >
          <img
            src="/altus-emblem-icon.png"
            alt="ALTUS Advisory"
            className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span
            className="text-white leading-none"
            style={canela}
          >
            <span className="block text-xl tracking-wide font-normal">ALTUS</span>
            <span
              className="block text-[9px] tracking-[0.3em] text-[#C45B2F] font-bold mt-0.5"
              style={neueHaas}
            >
              ADVISORY
            </span>
          </span>
        </motion.div>
      </div>

      {/* Left Main Experience Content (7 Columns) */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between relative z-10 p-10 xl:p-14 pt-28 pb-12">
        {/* Middle Hero Section */}
        <div className="my-auto space-y-8 max-w-3xl">
          {/* Top Badge & Headline layout split with Circular Staff Widget */}
          <div className="grid grid-cols-12 gap-6 items-center">
            {/* Left Headline (7 cols) */}
            <div className="col-span-7 space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#C45B2F]/40 bg-[#C45B2F]/10 backdrop-blur-md text-[#E07A5F] text-[11px] font-bold uppercase tracking-wider"
                style={neueHaas}
              >
                <UserCheck className="w-3.5 h-3.5 text-[#E07A5F]" />
                <span>{isRTL ? 'بوابة الموظفين والخدمات الفندقية' : 'INTERNAL EMPLOYEE & STAFF PORTAL'}</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-4xl xl:text-5xl text-white font-normal leading-[1.15] drop-shadow-md"
                style={canela}
              >
                {t('welcome_title')}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="text-slate-300 text-xs xl:text-sm leading-relaxed font-normal drop-shadow-sm max-w-md"
                style={inter}
              >
                {t('welcome_subtitle')}
              </motion.p>
            </div>

            {/* Right Circular Staff Widget (5 cols) */}
            <div className="col-span-5 flex justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.45 }}
                className="w-52 h-52 rounded-full border border-[#C45B2F]/40 p-4 flex flex-col items-center justify-center text-center shadow-[0_0_40px_rgba(196,91,47,0.2)] bg-[#12161F]/80 backdrop-blur-xl relative"
              >
                <div className="w-10 h-10 rounded-xl border border-[#C45B2F]/40 bg-[#C45B2F]/15 flex items-center justify-center text-[#E07A5F] mb-2">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-white tracking-wide mb-1" style={neueHaas}>
                  ALTUS Advisory<br />Staff Network
                </h4>
                <div className="flex items-center gap-1 my-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-bold text-xs" style={mono}>ONLINE</span>
                </div>
                <span className="text-[9px] font-bold tracking-widest text-[#E07A5F] uppercase" style={mono}>SYSTEMS ACTIVE</span>
                <p className="text-[9px] text-slate-400 mt-1 max-w-[140px] leading-tight" style={inter}>
                  Internal HR, Operations &amp; Department Portal
                </p>
              </motion.div>
            </div>
          </div>

          {/* Bottom 3 Employee Feature Cards */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <FeatureCard
              icon={UserCheck}
              title={isRTL ? 'الخدمات الذاتية' : 'EMPLOYEE SERVICES'}
              subtitle={isRTL ? 'إدارة طلبات الموارد البشرية والرواتب والمسيرات' : 'Access HR records, payroll, leave requests & SOPs'}
              delay={0.55}
            />
            <FeatureCard
              icon={ShieldCheck}
              title={isRTL ? 'العمليات اليومية' : 'DAILY OPERATIONS'}
              subtitle={isRTL ? 'متابعة المهام الفندقية وإدارة النزلاء' : 'Manage hotel tasks, housekeeping & guest requests'}
              delay={0.65}
            />
            <FeatureCard
              icon={Users}
              title={isRTL ? 'دليل الفنادق' : 'PROPERTY DIRECTORY'}
              subtitle={isRTL ? 'التواصل مع فروع وموظفي ألتوس' : 'Connect with hotel properties & department teams'}
              delay={0.75}
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-6 flex items-center justify-between border-t border-white/10 text-xs text-slate-400" style={inter}>
          <span>{t('copyright', { year })}</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#E07A5F] tracking-wider" style={mono}>ALTUS ADVISORY INTRANET</span>
            <ChevronRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {/* Right Column - Login Card Container (5 Columns) */}
      <div className="lg:col-span-5 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-10 relative z-20 min-h-screen lg:min-h-0 pt-28 lg:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="bg-[#12161F]/95 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(196,91,47,0.2)] border border-[#C45B2F]/40 w-full max-w-[440px] relative overflow-hidden mt-6 lg:mt-0"
        >
          {/* Multi-tone Metallic Top Ribbon */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[#C45B2F] via-[#E07A5F] to-[#D9C6A3]" />

          {/* Subtle Art Deco Geometric Corner Brackets */}
          <div className="absolute top-3 start-3 w-3 h-3 border-t border-s border-[#C45B2F]/60 pointer-events-none" />
          <div className="absolute top-3 end-3 w-3 h-3 border-t border-e border-[#C45B2F]/60 pointer-events-none" />
          <div className="absolute bottom-3 start-3 w-3 h-3 border-b border-s border-[#C45B2F]/60 pointer-events-none" />
          <div className="absolute bottom-3 end-3 w-3 h-3 border-b border-e border-[#C45B2F]/60 pointer-events-none" />

          {/* Header Branding */}
          <div className="text-center mb-6 pt-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#C45B2F]/10 border border-[#C45B2F]/30 text-[#E07A5F] mx-auto mb-3 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>

            <h2 className="text-2xl sm:text-3xl text-white font-normal mb-1 tracking-tight" style={canela}>
              {t('sign_in_title')}
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto" style={inter}>
              {t('sign_in_subtitle')}
            </p>
          </div>

          {/* Integrated Login Form */}
          <LoginForm />
        </motion.div>
      </div>
    </div>
  );
}

