import { LoginForm } from '@/components/auth/LoginForm'
import { Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Login() {
  const { t } = useTranslation('auth')
  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand Side - Hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-10 text-primary-foreground relative overflow-hidden">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/40"></div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-hotel-gold/90 text-primary shadow-lg border border-hotel-gold/50 backdrop-blur-sm">
            <Building2 className="w-8 h-8" />
          </div>
          <span className="text-2xl font-bold tracking-tight font-heading text-hotel-gold">Prime Hotels</span>
        </div>

        <div className="relative z-10 space-y-4 max-w-lg">
          <h1 className="text-4xl font-bold tracking-tight">
            {t('welcome_title')}
          </h1>
          <p className="text-primary-foreground/90 mt-2 text-lg leading-relaxed font-light">
            {t('welcome_subtitle')}
          </p>
        </div>

        <div className="relative z-10 text-sm text-primary-foreground/60">
          {t('copyright', { year })}
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-semibold tracking-tight">{t('sign_in_title')}</h2>
            <p className="text-gray-600">
              {t('sign_in_subtitle')}
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}

