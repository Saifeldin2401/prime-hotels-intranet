import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Award, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle, 
  ExternalLink,
  Flame,
  Star,
  Sparkles
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface CertificateItem {
  id: string
  title: string
  certificate_number: string
  completion_date: string
  status: string
  score?: number | null
}

export const CertificationsAndSkillsWidget: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common'])
  const { user } = useAuth()
  const navigate = useNavigate()
  const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

  const { data: userCerts = [], isLoading } = useQuery<CertificateItem[]>({
    queryKey: ['dashboard_user_certificates', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('certificates')
        .select('id, title, certificate_number, completion_date, status, score')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('completion_date', { ascending: false })
        .limit(3)

      if (error) return []
      return data || []
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl transition-all">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isRTL ? 'شهاداتي وجداراتي المعتمدة' : 'Certifications & Credentials'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'الشهادات الرقمية الموثقة والإنجازات' : 'Verified digital hotel qualifications'}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/learning/certificates')}
            className="h-8 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <span>{isRTL ? 'عرض الكل' : 'View all'}</span>
            <ArrowRight className={`ms-1 h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Certificate Highlights */}
        <div className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/40" />
            ))
          ) : userCerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-2.5">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-foreground">
                {isRTL ? 'ابدأ في إنجاز الدورات للحصول على شهادتك الأولى' : 'Complete your training to earn verified certificates'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                {isRTL ? 'تحصل على شهادة موثقة مع رمز QR فور اجتياز كل مسار' : 'Digital QR-verified certificates are issued automatically upon course completion'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/learning')}
                className="mt-3 h-8 text-xs font-semibold rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-50"
              >
                <Sparkles className="me-1.5 h-3.5 w-3.5" />
                <span>{isRTL ? 'استكشف المسارات التدريبية' : 'Browse Courses'}</span>
              </Button>
            </div>
          ) : (
            userCerts.map((cert) => (
              <div
                key={cert.id}
                onClick={() => navigate(`/verify/certificate/${cert.id}`)}
                className="group flex cursor-pointer items-center justify-between rounded-2xl border border-border/40 bg-background/60 p-3.5 transition-all hover:border-emerald-500/30 hover:bg-background/90"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-emerald-600 transition-colors">
                      {cert.title}
                    </h4>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {cert.certificate_number} • {new Date(cert.completion_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {typeof cert.score === 'number' && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                      {cert.score}%
                    </Badge>
                  )}
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Mastery Banner */}
      <div className="mt-4 rounded-2xl border border-border/40 bg-muted/30 p-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-foreground text-[11px]">
              {isRTL ? 'جدارة التميز الفندقي' : 'Hospitality Excellence'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isRTL ? 'معايير خدمة 5 نجوم' : '5-Star Quality Standards'}
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 bg-amber-500/5 font-semibold">
          Level 1 Pro
        </Badge>
      </div>
    </div>
  )
}
export default CertificationsAndSkillsWidget
