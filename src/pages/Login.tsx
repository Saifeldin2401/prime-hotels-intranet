import { LoginForm } from '@/components/auth/LoginForm'
import { Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'

export default function Login() {
  const { t } = useTranslation('auth')
  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand Side - Hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between bg-hotel-navy text-white relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 transform hover:scale-105"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-hotel-navy/60 backdrop-blur-[2px]"></div>

        {/* Gradient Overlay for Depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-hotel-navy via-transparent to-transparent opacity-90"></div>

        <div className="relative z-10 p-12 flex items-start justify-between">
          <img
            src="/prime-logo-light.png"
            alt="Prime Hotels"
            className="h-16 w-auto opacity-90"
          />
          <LanguageSwitcher />
        </div>

        <div className="relative z-10 p-12 space-y-6 max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tight font-heading text-white leading-tight">
            {t('welcome_title')}
          </h1>
          <p className="text-white/80 text-xl leading-relaxed font-light max-w-lg">
            {t('welcome_subtitle')}
          </p>
        </div>

        <div className="relative z-10 p-12 text-sm text-white/50 font-medium">
          {t('copyright', { year })}
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center bg-gray-50 p-4 sm:p-6 md:p-8 min-h-screen lg:min-h-0 pt-safe pb-safe">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          {/* Mobile Logo with Language Switcher */}
          <div className="flex flex-col items-center lg:hidden mb-8">
            <div className="w-full flex justify-between items-center mb-4">
              <img
                src="/prime-logo-dark.png"
                alt="Prime Hotels"
                className="h-12 w-auto"
              />
              <LanguageSwitcher />
            </div>
          </div>

          <div className="flex flex-col space-y-3 text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-hotel-navy font-heading">{t('sign_in_title')}</h2>
            <p className="text-gray-500 text-sm">
              {t('sign_in_subtitle')}
            </p>
          </div>

          <LoginForm />

          {/* Mobile copyright */}
          <div className="text-center text-xs text-gray-400 lg:hidden pt-8">
            {t('copyright', { year })}
          </div>
        </div>
      </div>
    </div>
  )
}

