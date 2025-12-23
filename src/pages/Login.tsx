import { LoginForm } from '@/components/auth/LoginForm'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { motion } from 'framer-motion'

export default function Login() {
  const { t, i18n } = useTranslation('auth')
  const year = new Date().getFullYear()
  const isRTL = i18n.dir() === 'rtl'

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand Side - Hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between bg-hotel-navy text-white relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] transform hover:scale-110 motion-safe:animate-ken-burns"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-hotel-navy/80 backdrop-blur-[1px]"></div>

        {/* Gradient Overlay for Depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-hotel-navy via-transparent to-transparent opacity-90"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent mix-blend-overlay"></div>

        <div className="relative z-10 p-12 flex items-start justify-between">
          <motion.img
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            src="/prime-logo-light.png"
            alt="Prime Hotels"
            className="h-16 w-auto opacity-90"
          />
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <LanguageSwitcher variant="ghost" className="text-white hover:text-white/80 hover:bg-white/10" />
          </motion.div>
        </div>

        <div className="relative z-10 p-12 space-y-6 max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-5xl font-bold tracking-tight font-heading text-white leading-tight drop-shadow-lg"
          >
            {t('welcome_title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-white/80 text-xl leading-relaxed font-light max-w-lg"
          >
            {t('welcome_subtitle')}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative z-10 p-12 text-sm text-white/40 font-medium flex justify-between items-center"
        >
          <span>{t('copyright', { year })}</span>
          <span className="text-xs uppercase tracking-widest opacity-60">PHG Connect</span>
        </motion.div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center bg-gray-50 p-4 sm:p-6 md:p-8 min-h-screen lg:min-h-0 pt-safe pb-safe relative">
        <div className="w-full max-w-[440px] bg-white p-8 sm:p-10 rounded-2xl shadow-2xl border border-gray-100/50 backdrop-blur-xl relative z-20">

          {/* Mobile Logo with Language Switcher */}
          <div className="flex flex-col items-center lg:hidden mb-8">
            <div className="w-full flex justify-between items-center mb-6">
              <img
                src="/prime-logo-dark.png"
                alt="Prime Hotels"
                className="h-10 w-auto"
              />
              <LanguageSwitcher />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col space-y-3 text-center mb-8"
          >
            <h2 className="text-3xl font-bold tracking-tight text-hotel-navy font-heading">
              {t('sign_in_title')}
            </h2>
            <p className="text-gray-500 text-sm">
              {t('sign_in_subtitle')}
            </p>
          </motion.div>

          <LoginForm />

          {/* Mobile copyright */}
          <div className="text-center text-xs text-gray-400 lg:hidden pt-8">
            {t('copyright', { year })}
          </div>
        </div>

        {/* Background Pattern for Right Side */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl opacity-50"></div>
        </div>
      </div>
    </div>
  )
}

