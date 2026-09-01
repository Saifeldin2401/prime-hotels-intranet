import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, Mail, Globe, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface TenantEmailPreviewModalProps {
  orgName: string
  orgNameAr?: string
  logoUrl?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  senderName?: string
  replyTo?: string
  supportEmail?: string
  websiteUrl?: string
  footerText?: string
  footerTextAr?: string
}

type TemplateType = 'invitation' | 'reset_password' | 'course_assigned' | 'certificate'

export function TenantEmailPreviewModal({
  orgName,
  orgNameAr,
  logoUrl,
  primaryColor,
  secondaryColor,
  accentColor,
  senderName,
  replyTo,
  supportEmail,
  websiteUrl,
  footerText,
  footerTextAr,
}: TenantEmailPreviewModalProps) {
  const { t } = useTranslation(['admin', 'common'])
  const [templateType, setTemplateType] = useState<TemplateType>('invitation')
  const [lang, setLang] = useState<'en' | 'ar'>('en')

  const effectiveOrgName = (lang === 'ar' ? orgNameAr || orgName : orgName) || 'Hotel Organization'
  const effectiveSenderName = senderName || effectiveOrgName
  const effectiveReplyTo = replyTo || supportEmail || 'support@hotel-platform.com'
  const effectiveLogo = logoUrl || '/altus-emblem-icon.png'
  const effectiveFooter = lang === 'ar'
    ? (footerTextAr || 'جميع الحقوق محفوظة.')
    : (footerText || 'All rights reserved.')
  const effectiveWebsite = websiteUrl || 'https://www.example.com'

  const headerGradient = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
  const isRtl = lang === 'ar'

  const renderEmailBody = () => {
    switch (templateType) {
      case 'invitation':
        return {
          subject: lang === 'ar' ? `دعوة للانضمام إلى ${effectiveOrgName}` : `You are invited to join ${effectiveOrgName}`,
          badge: lang === 'ar' ? '✨ دعوة مستخدم جديد' : '✨ Team Invitation',
          title: lang === 'ar' ? 'مرحباً بك في فريق العمل' : 'Welcome to the Team',
          greeting: lang === 'ar' ? 'مرحباً سارة،' : 'Hello Sarah,',
          message: lang === 'ar'
            ? `تمت دعوتك للانضمام إلى بوابة ${effectiveOrgName}. يرجى النقر أدناه لتعيين كلمة المرور وبدء رحلتك المهنية.`
            : `You have been invited to join the ${effectiveOrgName} operational portal. Click below to set your password and complete your profile.`,
          cta: lang === 'ar' ? 'إكمال إعداد الحساب' : 'Complete Account Setup',
        }
      case 'reset_password':
        return {
          subject: lang === 'ar' ? `إعادة تعيين كلمة المرور - ${effectiveOrgName}` : `Password Reset - ${effectiveOrgName}`,
          badge: lang === 'ar' ? '🔐 أمان الحساب' : '🔐 Account Security',
          title: lang === 'ar' ? 'طلب إعادة تعيين كلمة المرور' : 'Password Reset Request',
          greeting: lang === 'ar' ? 'مرحباً أحمد،' : 'Hello Ahmed,',
          message: lang === 'ar'
            ? 'تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. ينتهي هذا الرابط خلال 60 دقيقة.'
            : 'We received a request to reset your account password. This link will expire in 60 minutes.',
          cta: lang === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password',
        }
      case 'course_assigned':
        return {
          subject: lang === 'ar' ? `دورة تدريبية جديدة: معايير الخدمة الفندقية` : `New Course Assigned: Luxury Hospitality Standards`,
          badge: lang === 'ar' ? '📚 الأكاديمية والتدريب' : '📚 Learning & Development',
          title: lang === 'ar' ? 'تم تعيين برنامج تدريبي جديد لك' : 'New Training Program Assigned',
          greeting: lang === 'ar' ? 'مرحباً خالد،' : 'Hello Khalid,',
          message: lang === 'ar'
            ? `تم تسجيلك في برنامج "معايير الضيافة والخدمة الفندقية". يرجى إكماله قبل الموعد النهائي.`
            : `You have been enrolled in "Luxury Hospitality & Front Office Excellence". Please complete the modules before the deadline.`,
          cta: lang === 'ar' ? 'بدء الدورة الآن' : 'Start Course Now',
        }
      case 'certificate':
        return {
          subject: lang === 'ar' ? `تهانينا! حصلت على شهادة إتمام` : `Congratulations! Certificate of Completion`,
          badge: lang === 'ar' ? '🎓 شهادة معتمدة' : '🎓 Verified Certificate',
          title: lang === 'ar' ? 'مبارك إتمامك البرنامج التدريبي!' : 'Congratulations on Your Achievement!',
          greeting: lang === 'ar' ? 'مرحباً نورة،' : 'Hello Noura,',
          message: lang === 'ar'
            ? `لقد أتممت بنجاح متطلبات التدريب الإلزامي لمعايير السلامة والجودة بدرجة 100%. شهادتك جاهزة للتحميل.`
            : `You have successfully completed the Mandatory Food Safety & HACCP Standards with a 100% score. Your certificate is ready to view.`,
          cta: lang === 'ar' ? 'عرض وتحميل الشهادة' : 'View & Download Certificate',
        }
    }
  }

  const content = renderEmailBody()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
          <Eye className="h-4 w-4" />
          {t('admin:preview_emails', 'Live Email Preview')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <DialogTitle>{t('admin:tenant_email_preview', 'Tenant Branded Email Preview')}</DialogTitle>
            </div>
            <div className="flex items-center gap-2 me-6">
              <Button
                variant={lang === 'en' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setLang('en')}
              >
                English (LTR)
              </Button>
              <Button
                variant={lang === 'ar' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setLang('ar')}
              >
                العربية (RTL)
              </Button>
            </div>
          </div>
          <DialogDescription>
            {t('admin:tenant_email_preview_desc', 'See exactly how outgoing transactional emails look with your customized logo, brand colors, sender name, and footer.')}
          </DialogDescription>
        </DialogHeader>

        {/* Template Selector */}
        <div className="py-2">
          <Tabs value={templateType} onValueChange={(val) => setTemplateType(val as TemplateType)}>
            <TabsList className="grid grid-cols-4 w-full text-xs">
              <TabsTrigger value="invitation" className="text-xs">
                {lang === 'ar' ? 'دعوة المستخدم' : 'Invitation'}
              </TabsTrigger>
              <TabsTrigger value="reset_password" className="text-xs">
                {lang === 'ar' ? 'إعادة كلمة المرور' : 'Password Reset'}
              </TabsTrigger>
              <TabsTrigger value="course_assigned" className="text-xs">
                {lang === 'ar' ? 'تعيين دورة' : 'Course Assigned'}
              </TabsTrigger>
              <TabsTrigger value="certificate" className="text-xs">
                {lang === 'ar' ? 'شهادة إتمام' : 'Certificate'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Simulated Email Client Shell */}
        <div className="rounded-xl border bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3 font-sans">
          {/* Email Headers Meta */}
          <div className="bg-white dark:bg-slate-950 p-3 rounded-lg border text-xs space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold w-16">From:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {effectiveSenderName} &lt;notifications@phg-connect.com&gt;
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold w-16">Reply-To:</span>
              <span className="font-mono text-slate-600 dark:text-slate-400">{effectiveReplyTo}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold w-16">Subject:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{content.subject}</span>
            </div>
          </div>

          {/* Email HTML Body Canvas */}
          <div
            className="max-w-[560px] mx-auto bg-white dark:bg-slate-950 rounded-2xl border shadow-md overflow-hidden"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Dynamic Header */}
            <div
              className="p-8 text-center text-white relative"
              style={{ background: headerGradient }}
            >
              <div className="flex justify-center mb-3">
                <img
                  src={effectiveLogo}
                  alt={effectiveOrgName}
                  className="max-h-12 max-w-[200px] object-contain drop-shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none'
                  }}
                />
              </div>
              <div
                className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                {content.badge}
              </div>
            </div>

            {/* Email Main Content */}
            <div className={`p-8 space-y-5 ${isRtl ? 'text-right' : 'text-left'}`}>
              <h2
                className="text-xl font-bold tracking-tight"
                style={{ color: primaryColor }}
              >
                {content.title}
              </h2>

              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {content.greeting}
              </p>

              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {content.message}
              </p>

              {/* Action Button */}
              <div className={`pt-3 pb-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                <div
                  className="inline-block px-6 py-3 rounded-lg text-white font-semibold text-sm shadow-md cursor-pointer transition-transform hover:scale-105"
                  style={{ background: headerGradient }}
                >
                  {content.cta}
                </div>
              </div>

              {/* Trouble clicking notice */}
              <div className="pt-4 border-t text-[11px] text-muted-foreground leading-relaxed">
                <p>
                  {lang === 'ar'
                    ? 'إذا واجهت صعوبة في النقر على الزر أعلاه، يرجى زيارة بوابة المنصة مباشرة.'
                    : 'If you have trouble clicking the button, visit the portal directly:'}
                </p>
                <span className="font-mono underline text-xs break-all" style={{ color: primaryColor }}>
                  {effectiveWebsite}
                </span>
              </div>
            </div>

            {/* Dynamic Tenant Footer */}
            <div
              className="p-6 text-center text-white/90 text-xs space-y-2 border-t"
              style={{ backgroundColor: primaryColor }}
            >
              <p className="font-medium">{effectiveFooter}</p>
              <div className="flex items-center justify-center gap-3 text-[11px] text-white/70">
                <a href={effectiveWebsite} className="hover:underline font-semibold" style={{ color: accentColor }}>
                  {effectiveOrgName}
                </a>
                <span>&bull;</span>
                <a href={`mailto:${effectiveReplyTo}`} className="hover:underline">
                  {lang === 'ar' ? 'الدعم والمساعدة' : 'Support'}
                </a>
              </div>
              <p className="text-[10px] text-white/40 pt-1">
                &copy; {new Date().getFullYear()} {effectiveOrgName}. {lang === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
