import { LoginForm } from '@/components/auth/LoginForm'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { motion, useReducedMotion } from 'framer-motion'
import { Building2, ChevronRight, ShieldCheck, Sparkles, UserCheck, Users, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Animated ambient background particles
function Particle({ delay, x, y, size }: { delay: number; x: string; y: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-amber-300/30 blur-[1px]"
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
        ease: "easeOut",
      }}
    />
  )
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
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(16px)' }}
      className="group p-5 rounded-2xl border border-amber-500/40 hover:border-amber-400 transition-all duration-300 shadow-2xl flex flex-col justify-between h-38"
    >
      <div className="w-11 h-11 rounded-xl border border-amber-400/50 bg-amber-500/10 flex items-center justify-center text-amber-400 shadow-inner group-hover:scale-105 transition-transform">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-white mb-1">{title}</h4>
        <p className="text-[11px] text-slate-300 font-normal leading-relaxed">{subtitle}</p>
      </div>
    </motion.div>
  )
}

export default function Login() {
  const { t, i18n } = useTranslation('auth')
  const year = new Date().getFullYear()
  const isRTL = i18n.dir() === 'rtl'
  const prefersReducedMotion = useReducedMotion()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // Mouse movement parallax effect
  useEffect(() => {
    if (prefersReducedMotion) return

    let frame = 0
    const handleMouseMove = (e: MouseEvent) => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        setMousePosition({
          x: (e.clientX / window.innerWidth - 0.5) * 12,
          y: (e.clientY / window.innerHeight - 0.5) * 12,
        })
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [prefersReducedMotion])

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
  )

  return (
    <div className="min-h-screen grid lg:grid-cols-12 overflow-hidden bg-slate-950 font-sans text-slate-100 relative">
      {/* Background Resort Photography Layer */}
      <motion.div
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 25, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/hero-resort.png')",
        }}
      />

      {/* Dark Vignette Overlay for Crisp Readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-slate-950/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/60" />

      {/* Parallax Ambient Orbs */}
      <motion.div
        animate={{
          x: mousePosition.x * 2,
          y: mousePosition.y * 2,
        }}
        transition={{ type: "spring", stiffness: 40, damping: 25 }}
        className="absolute top-1/3 start-1/4 w-[400px] h-[400px] bg-amber-500/15 rounded-full blur-[120px] pointer-events-none"
      />

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <Particle key={p.id} {...p} />
        ))}
      </div>

      {/* Fixed Top Right Language Switcher Position with Zero Overlap */}
      <div className="absolute top-5 end-6 lg:top-8 lg:end-10 z-40">
        <LanguageSwitcher
          variant="outline"
          className="bg-slate-900/90 border-slate-700 text-white hover:bg-slate-800 rounded-full px-4 py-2 text-xs backdrop-blur-md shadow-xl"
        />
      </div>

      {/* Top Left Branding Logo */}
      <div className="absolute top-6 start-6 lg:top-8 lg:start-10 z-30 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
        >
          <img
            src="/altus-logo-web.png"
            alt="ALTUS Advisory"
            className="h-12 sm:h-14 w-auto object-contain filter drop-shadow-2xl brightness-110"
          />
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
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 backdrop-blur-md text-amber-300 text-[11px] font-bold uppercase tracking-wider"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>{isRTL ? "بوابة الموظفين والخدمات الفندقية" : "INTERNAL EMPLOYEE & STAFF PORTAL"}</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-4xl xl:text-5xl font-serif text-white font-normal leading-[1.15] drop-shadow-md"
              >
                {t('welcome_title')}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="text-slate-300 text-xs xl:text-sm leading-relaxed font-normal drop-shadow-sm max-w-md"
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
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(16px)' }}
                className="w-52 h-52 rounded-full border border-amber-500/40 p-4 flex flex-col items-center justify-center text-center shadow-2xl"
              >
                <div className="w-10 h-10 rounded-xl border border-amber-400/50 bg-amber-500/15 flex items-center justify-center text-amber-400 mb-2">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-white tracking-wide mb-1">
                  ALTUS Advisory<br />Staff Network
                </h4>
                <div className="flex items-center gap-1 my-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-extrabold text-sm">ONLINE</span>
                </div>
                <span className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase">SYSTEMS ACTIVE</span>
                <p className="text-[9px] text-slate-400 mt-1 max-w-[140px] leading-tight">
                  Internal HR, Operations & Department Portal
                </p>
              </motion.div>
            </div>
          </div>

          {/* Bottom 3 Employee Feature Cards */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <FeatureCard
              icon={UserCheck}
              title={isRTL ? "الخدمات الذاتية" : "EMPLOYEE SERVICES"}
              subtitle={isRTL ? "إدارة طلبات الموارد البشرية والرواتب والمسيرات" : "Access HR records, payroll, leave requests & SOPs"}
              delay={0.55}
            />
            <FeatureCard
              icon={ShieldCheck}
              title={isRTL ? "العمليات اليومية" : "DAILY OPERATIONS"}
              subtitle={isRTL ? "متابعة المهام الفندقية وإدارة النزلاء" : "Manage hotel tasks, housekeeping & guest requests"}
              delay={0.65}
            />
            <FeatureCard
              icon={Users}
              title={isRTL ? "دليل الفنادق" : "PROPERTY DIRECTORY"}
              subtitle={isRTL ? "التواصل مع فروع وموظفي ألتوس" : "Connect with hotel properties & department teams"}
              delay={0.75}
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-6 flex items-center justify-between border-t border-white/15 text-xs text-slate-300">
          <span>{t('copyright', { year })}</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-300 tracking-wider">ALTUS ADVISORY INTRANET</span>
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
          className="bg-white rounded-[32px] p-8 sm:p-10 shadow-2xl border-t-4 border-amber-500 w-full max-w-[420px] relative overflow-hidden mt-6 lg:mt-0"
        >
          {/* Header Branding Logo */}
          <div className="text-center mb-6">
            <img
              src="/altus-logo-web.png"
              alt="ALTUS Advisory"
              className="h-16 sm:h-20 w-auto object-contain mx-auto mb-3 filter drop-shadow-sm"
            />

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1 font-sans">
              {t('sign_in_title')}
            </h2>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
              {t('sign_in_subtitle')}
            </p>
          </div>

          {/* Integrated Login Form */}
          <LoginForm />
        </motion.div>
      </div>
    </div>
  )
}
