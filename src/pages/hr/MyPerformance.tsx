import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePerformanceReviews } from '@/hooks/usePerformance'
import { useMyCertificates } from '@/hooks/useCertificates'
import { Award, Star, Calendar as CalendarIcon, User, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { Progress } from '@/components/ui/progress'

import { useTranslation } from 'react-i18next'
import { ar, enUS } from 'date-fns/locale'

export default function MyPerformance() {
    const { t, i18n } = useTranslation('hr')
    const dateLocale = i18n.language.startsWith('ar') ? ar : enUS
    const { data: reviews, isLoading } = usePerformanceReviews()
    const { data: certificates } = useMyCertificates()

    const latestReview = reviews?.[0]

    return (
        <MotionWrapper>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('performance.title')}</h1>
                        <p className="text-muted-foreground">{t('performance.description')}</p>
                    </div>
                    {latestReview && (
                        <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-bold">{t('performance.latest_rating', { rating: latestReview.overall_rating })}</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Summary Card */}
                    <Card className="md:col-span-1 shadow-lg border-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                {t('performance.progress_summary')}
                            </CardTitle>
                            <CardDescription>{t('performance.growth_over_time')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span>{t('performance.overall_achievement')}</span>
                                    <span>{latestReview ? (latestReview.overall_rating * 20) : 0}%</span>
                                </div>
                                <Progress value={latestReview ? (latestReview.overall_rating * 20) : 0} className="h-2" />
                            </div>

                            <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Award className="w-4 h-4 text-primary" />
                                    {t('performance.key_strengths')}
                                </h4>
                                <p className="text-sm text-muted-foreground italic">
                                    "{latestReview?.strengths || t('performance.no_strengths')}"
                                </p>
                            </div>

                            <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/10 space-y-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2 text-orange-600">
                                    <Star className="w-4 h-4" />
                                    {t('performance.focus_areas')}
                                </h4>
                                <p className="text-sm text-muted-foreground italic">
                                    "{latestReview?.areas_for_improvement || t('performance.no_focus_areas')}"
                                </p>
                            </div>

                            <div className="pt-4 border-t border-muted">
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                    <Award className="w-4 h-4 text-hotel-gold" />
                                    {t('performance.recent_certificates')}
                                </h4>
                                <div className="space-y-2">
                                    {certificates?.slice(0, 3).map((cert) => (
                                        <div key={cert.id} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-muted/50">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-hotel-gold" />
                                                <span className="text-[10px] font-medium truncate max-w-[120px]">{cert.title}</span>
                                            </div>
                                            <span className="text-[9px] text-muted-foreground">
                                                {format(new Date(cert.completionDate), 'MMM yyyy', { locale: dateLocale })}
                                            </span>
                                        </div>
                                    ))}
                                    {(!certificates || certificates.length === 0) && (
                                        <p className="text-[10px] text-muted-foreground text-center py-2">{t('performance.no_certificates')}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* History Card */}
                    <Card className="md:col-span-2 shadow-lg border-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-primary" />
                                {t('performance.review_history')}
                            </CardTitle>
                            <CardDescription>{t('performance.past_evaluations')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px] w-full pr-4">
                                {isLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {reviews?.map((review) => (
                                            <div
                                                key={review.id}
                                                className="p-5 rounded-xl border bg-card hover:border-primary/50 transition-all space-y-4"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1">
                                                        <h3 className="font-bold text-lg">{review.review_period}</h3>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <User className="w-3 h-3" />
                                                            <span>{t('performance.reviewed_by')}: {review.reviewer?.full_name || 'System'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <Badge className="bg-primary text-primary-foreground font-bold">
                                                            {t('performance.rating')}: {review.overall_rating}/5
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground">
                                                            {format(new Date(review.created_at || ''), 'MMM d, yyyy', { locale: dateLocale })}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-muted">
                                                    <div className="space-y-1">
                                                        <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{t('performance.comments')}</span>
                                                        <p className="text-sm line-clamp-3">{review.comments}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{t('performance.future_goals')}</span>
                                                        <p className="text-sm line-clamp-3">{review.goals}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {reviews?.length === 0 && (
                                            <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                                                <Award className="w-12 h-12 text-muted/40 mx-auto mb-3" />
                                                <p className="text-muted-foreground font-medium">{t('performance.no_reviews')}</p>
                                                <p className="text-sm text-muted-foreground/60">{t('performance.reviews_will_appear')}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MotionWrapper>
    )
}
