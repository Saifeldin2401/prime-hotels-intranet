import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  Flame,
  Sparkles,
  Trophy,
  Users,
  UtensilsCrossed,
  BedDouble,
  ShieldCheck,
  Crown,
  X,
} from 'lucide-react'

import { useMarkWelcomeSeen } from '../gamificationHooks'
import { cn } from '@/lib/utils'

interface FirstRunWelcomeModalProps {
  isOpen: boolean
  onClose: () => void
}

const DISCIPLINES = [
  { id: 'front_office', icon: Compass, labelEn: 'Front Office & Reception', labelAr: 'المكاتب الأمامية والاستقبال' },
  { id: 'culinary', icon: UtensilsCrossed, labelEn: 'Food & Beverage', labelAr: 'الأغذية والمشروبات' },
  { id: 'housekeeping', icon: BedDouble, labelEn: 'Housekeeping & Rooms', labelAr: 'التدبير الفندقي والغرف' },
  { id: 'hafawah', icon: Sparkles, labelEn: 'Guest Relations & Hafawah', labelAr: 'علاقات النزلاء والحفاوة' },
  { id: 'security', icon: ShieldCheck, labelEn: 'Safety & Security', labelAr: 'الأمن والسلامة الفندقية' },
  { id: 'leadership', icon: Crown, labelEn: 'Leadership & Operations', labelAr: 'القيادة والعمليات' },
] as const

export function FirstRunWelcomeModal({ isOpen, onClose }: FirstRunWelcomeModalProps) {
  const { t, i18n } = useTranslation(['training', 'common'])
  const isArabic = i18n.language?.startsWith('ar')
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const markWelcome = useMarkWelcomeSeen()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('front_office')

  if (!isOpen) return null

  const handleFinish = async (goToCourses = false) => {
    try {
      await markWelcome.mutateAsync()
    } catch (e) {
      // Non-blocking error handling
      console.warn('Could not record welcome dismissal', e)
    }
    onClose()
    if (goToCourses) {
      navigate('/learn/courses')
    }
  }

  const handleNext = () => {
    if (step < 3) setStep((s) => (s + 1) as 1 | 2 | 3)
    else void handleFinish()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => void handleFinish(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Surface */}
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-ds-border bg-ds-surface shadow-2xl text-ds-ink"
      >
        {/* Header accent strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-ds-accent via-ds-brass to-ds-chrome-accent" />

        {/* Close Button */}
        <button
          type="button"
          onClick={() => void handleFinish(false)}
          className="absolute top-4 end-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-ds-muted hover:bg-ds-surface-subtle hover:text-ds-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
          aria-label={t('common:actions.close', 'Close')}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Progress Indicators */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors duration-300',
                  s === step ? 'bg-ds-accent' : s < step ? 'bg-ds-accent/40' : 'bg-ds-border'
                )}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={reduce ? {} : { opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ds-accent-soft text-ds-accent">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h2 id="welcome-title" className="text-xl font-bold tracking-tight text-ds-ink sm:text-2xl">
                    {isArabic ? 'مرحباً بك في برايم كونكت' : 'Welcome to PRIME Connect'}
                  </h2>
                  <p className="mt-1 text-sm text-ds-muted">
                    {isArabic
                      ? 'منصتك الموحدة للتعلم وتطوير مهارات الضيافة الفاخرة واكتساب النقاط والشارات.'
                      : 'Your unified platform for luxury hospitality learning, operational excellence, and badges.'}
                  </p>
                </div>

                <div className="grid gap-3 pt-2">
                  <div className="flex items-start gap-3 rounded-lg border border-ds-border/60 bg-ds-surface-subtle/50 p-3">
                    <Trophy className="h-5 w-5 shrink-0 text-ds-accent mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-ds-ink">
                        {isArabic ? 'اكسب نقاطاً مع كل إنجاز' : 'Earn Points with Every Lesson'}
                      </p>
                      <p className="text-xs text-ds-muted">
                        {isArabic
                          ? '10 نقاط لكل درس، 50 نقطة لكل دورة، ونقاط إضافية عند التفوق.'
                          : '10 pts per lesson, 50 pts per course, and bonus points for high scores.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-ds-border/60 bg-ds-surface-subtle/50 p-3">
                    <Flame className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-ds-ink">
                        {isArabic ? 'حافظ على استمرارية تعلّمك' : 'Build Your Learning Streak'}
                      </p>
                      <p className="text-xs text-ds-muted">
                        {isArabic
                          ? 'تعلّم بضع دقائق يومياً للحفاظ على شعلة التعلّم مضيئة.'
                          : 'Learn a few minutes each day to keep your streak flame burning.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-ds-border/60 bg-ds-surface-subtle/50 p-3">
                    <Award className="h-5 w-5 shrink-0 text-ds-success mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-ds-ink">
                        {isArabic ? '13 شارة مهنية معتمدة' : '13 Hospitality Badges'}
                      </p>
                      <p className="text-xs text-ds-muted">
                        {isArabic
                          ? 'ارتقِ من رتبة مبتدئ وصولاً إلى رتبة الخبير المعتمد.'
                          : 'Progress from Newcomer all the way to Master rank.'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={reduce ? {} : { opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ds-accent-soft text-ds-accent">
                  <Compass className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-ds-ink sm:text-2xl">
                    {isArabic ? 'ما هو مجال اهتمامك الرئيسي؟' : 'What is your primary focus?'}
                  </h2>
                  <p className="mt-1 text-sm text-ds-muted">
                    {isArabic
                      ? 'اختر مجالك لتخصيص ترشيحات الدورات وإجراءات العمل اليومية.'
                      : 'Select your operational domain to tailor training and SOP recommendations.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  {DISCIPLINES.map((d) => {
                    const Icon = d.icon
                    const isSelected = selectedDiscipline === d.id
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDiscipline(d.id)}
                        className={cn(
                          'flex flex-col items-start gap-2 rounded-xl border p-3.5 text-start transition-all',
                          isSelected
                            ? 'border-ds-accent bg-ds-accent-soft/40 shadow-sm'
                            : 'border-ds-border bg-ds-surface hover:border-ds-border-strong hover:bg-ds-surface-subtle'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex h-8 w-8 items-center justify-center rounded-lg',
                            isSelected ? 'bg-ds-accent text-white' : 'bg-ds-surface-subtle text-ds-ink'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-semibold text-ds-ink">
                          {isArabic ? d.labelAr : d.labelEn}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={reduce ? {} : { opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 text-center"
              >
                <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-ds-success-soft text-ds-success">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-ds-ink sm:text-2xl">
                    {isArabic ? 'أنت جاهز تماماً!' : "You're All Set!"}
                  </h2>
                  <p className="mt-1 text-sm text-ds-muted max-w-sm mx-auto">
                    {isArabic
                      ? 'تم تهيئة ملفك التدريبي بنجاح برتبة مبتدئ. أكمل درسك الأول اليوم لتحصل على شارة "الخطوات الأولى".'
                      : 'Your training profile is ready at Newcomer rank. Complete your first lesson today to unlock the "First Steps" badge.'}
                  </p>
                </div>

                <div className="rounded-xl border border-ds-border bg-ds-surface-subtle/60 p-4 text-start">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ds-brass/20 text-ds-brass font-bold text-sm">
                      L1
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ds-ink">
                        {isArabic ? 'الرتبة الحالية: مبتدئ' : 'Current Rank: Newcomer'}
                      </p>
                      <p className="text-xs text-ds-muted">
                        {isArabic ? 'الهدف القادم: 100 نقطة للمستوى التالي' : 'Next milestone: 100 pts to reach Explorer'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Footer */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-ds-border">
            {step < 3 ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleFinish(false)}
                  className="text-xs font-semibold text-ds-muted hover:text-ds-ink hover:underline py-2"
                >
                  {isArabic ? 'تخطي الترحيب' : 'Skip introduction'}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-ds-ink px-5 text-sm font-semibold text-ds-on-ink hover:bg-ds-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
                >
                  <span>{isArabic ? 'متابعة' : 'Continue'}</span>
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleFinish(false)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-ds-border px-4 text-sm font-semibold text-ds-ink hover:bg-ds-surface-subtle"
                >
                  {isArabic ? 'الذهاب إلى يومي' : 'Go to My Day'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleFinish(true)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-ds-accent px-5 text-sm font-semibold text-white hover:bg-ds-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
                >
                  <span>{isArabic ? 'استكشف الدورات الآن' : 'Explore Courses'}</span>
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
