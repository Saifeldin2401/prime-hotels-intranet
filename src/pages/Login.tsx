import { LoginForm } from '@/components/auth/LoginForm'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Sparkles, Shield, Clock, Users, Fingerprint, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

// Animated background particles
function Particle({ delay, x, y, size }: { delay: number; x: string; y: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-white/20"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.4, 0],
        scale: [0, 1, 0],
        y: [0, -100, -200],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  )
}

// Feature item component with enhanced hover effects
function FeatureItem({
  icon: Icon,
  text,
  delay,
  subtitle
}: {
  icon: React.ElementType;
  text: string;
  delay: number;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ x: 8, transition: { duration: 0.2 } }}
      className="group flex items-start gap-4 text-white/90 cursor-default"
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg group-hover:shadow-white/20 transition-all duration-500 group-hover:scale-110">
          <Icon className="w-5 h-5 text-white drop-shadow-md" />
        </div>
        <motion.div
          className="absolute inset-0 rounded-2xl bg-white/30 blur-xl"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <div className="flex-1 pt-1">
        <span className="text-sm font-semibold tracking-wide block">{text}</span>
        {subtitle && (
          <span className="text-xs text-white/50 mt-0.5 block">{subtitle}</span>
        )}
      </div>
    </motion.div>
  )
}

// Glass card component for the right side
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* Glow effect behind card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-[2rem] blur-2xl opacity-60" />

      {/* Main card */}
      <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 dark:border-gray-700/50 overflow-hidden">
        {/* Inner gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-gray-50/50 dark:from-gray-800/50 dark:to-gray-900/50 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const { t, i18n } = useTranslation('auth')
  const year = new Date().getFullYear()
  const isRTL = i18n.dir() === 'rtl'
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Generate particles
  const particles = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        id: i,
        delay: i * 0.8,
        x: `${Math.random() * 100}%`,
        y: `${Math.random() * 100}%`,
        size: Math.random() * 4 + 2,
      })),
    []
  )

  return (
    <div className="min-h-screen grid lg:grid-cols-2 overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Left Side - Brand Experience */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden">
        {/* Layered Background */}
        <div className="absolute inset-0 bg-hotel-navy" />

        {/* Animated Background Image with Ken Burns effect */}
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 25, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop')",
          }}
        />

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-hotel-navy/95 via-hotel-navy/85 to-hotel-navy/90 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-hotel-navy via-transparent to-hotel-navy/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-hotel-navy/50 to-transparent" />

        {/* Animated Orbs */}
        <motion.div
          animate={{
            x: mousePosition.x * 2,
            y: mousePosition.y * 2,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
          className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            x: -mousePosition.x * 1.5,
            y: -mousePosition.y * 1.5,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
          className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px]"
        />

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p) => (
            <Particle key={p.id} {...p} />
          ))}
        </div>

        {/* Grid Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Header */}
        <div className="relative z-10 p-10 xl:p-14">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-start justify-between"
          >
            {/* Logo */}
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <img
                  src="/prime-logo-light.png"
                  alt="Prime Hotels"
                  className="h-14 w-auto opacity-95 drop-shadow-2xl"
                />
              </motion.div>
            </div>

            {/* Language Switcher */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <LanguageSwitcher
                variant="ghost"
                className="text-white/90 hover:text-white hover:bg-white/10 border border-white/20 backdrop-blur-md rounded-full px-4 py-2 transition-all duration-300"
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 px-10 xl:px-14 space-y-10 flex-1 flex flex-col justify-center max-w-3xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-white/15 to-white/5 backdrop-blur-md border border-white/25 shadow-lg">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
              </motion.div>
              <span className="text-sm font-medium text-white/95 tracking-wide">PHG Connect</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </div>
          </motion.div>

          {/* Heading */}
          <div className="space-y-5">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl xl:text-6xl font-bold tracking-tight text-white leading-[1.1] font-heading"
            >
              {t('welcome_title')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-white/65 text-lg xl:text-xl leading-relaxed font-light max-w-xl"
            >
              {t('welcome_subtitle')}
            </motion.p>
          </div>

          {/* Feature Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 gap-5 pt-4"
          >
            <FeatureItem
              icon={Shield}
              text={isRTL ? "وصول آمن ومحمي" : "Secure & Protected Access"}
              subtitle={isRTL ? "تشفير على مستوى المؤسسات" : "Enterprise-grade encryption"}
              delay={0.6}
            />
            <FeatureItem
              icon={Clock}
              text={isRTL ? "متوفر على مدار الساعة" : "Available 24/7"}
              subtitle={isRTL ? "وصول فوري في أي وقت" : "Instant access anytime"}
              delay={0.7}
            />
            <FeatureItem
              icon={Users}
              text={isRTL ? "تواصل مع فريقك" : "Connect with Your Team"}
              subtitle={isRTL ? "تعاون سلس" : "Seamless collaboration"}
              delay={0.8}
            />
            <FeatureItem
              icon={Fingerprint}
              text={isRTL ? "تجربة سلسة" : "Seamless Experience"}
              subtitle={isRTL ? "واجهة بديهية" : "Intuitive interface"}
              delay={0.9}
            />
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="relative z-10 p-10 xl:p-14"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40 font-medium">
              {t('copyright', { year })}
            </span>
            <div className="flex items-center gap-2 text-white/30">
              <span className="text-xs uppercase tracking-[0.2em] font-medium">PHG Connect</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Login Form */}
      <div className="relative flex items-center justify-center p-4 sm:p-6 md:p-8 min-h-screen lg:min-h-0">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient orbs */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"
          />

          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `linear-gradient(gray 1px, transparent 1px),
                                linear-gradient(90deg, gray 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Mobile Header */}
        <div className="absolute top-0 inset-x-0 p-4 lg:hidden z-30">
          <div className="flex items-center justify-between">
            <img
              src="/prime-logo-dark.png"
              alt="Prime Hotels"
              className="h-8 w-auto"
            />
            <LanguageSwitcher />
          </div>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[440px] relative z-10"
        >
          <GlassCard className="p-8 sm:p-10">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center mb-8"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 mb-6 shadow-lg shadow-primary/10 border border-primary/10"
              >
                <Shield className="w-8 h-8 text-primary" />
              </motion.div>

              {/* Title */}
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white font-heading mb-2">
                {t('sign_in_title')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t('sign_in_subtitle')}
              </p>
            </motion.div>

            {/* Login Form */}
            <LoginForm />

            {/* Mobile Footer */}
            <div className="text-center text-xs text-gray-400 lg:hidden mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              {t('copyright', { year })}
            </div>
          </GlassCard>
        </motion.div>

        {/* Bottom decoration for mobile */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-gray-100/50 to-transparent lg:hidden pointer-events-none" />
      </div>
    </div>
  )
}
