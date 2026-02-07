import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, Star, PartyPopper, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { useProperty } from '@/contexts/PropertyContext'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface EOMData {
    id: string
    reason_en: string
    reason_ar: string
    month: number
    year: number
    profile: {
        id: string
        full_name: string
        avatar_url: string | null
        job_title: string | null
    }
}

interface EmployeeOfMonthWidgetProps {
    className?: string
}

export function EmployeeOfMonthWidget({ className }: EmployeeOfMonthWidgetProps) {
    const { t, i18n } = useTranslation('dashboard')
    const { currentProperty } = useProperty()
    const [winner, setWinner] = useState<EOMData | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchWinner = async () => {
        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()

        try {
            let queryBuilder = supabase
                .from('employee_of_the_month')
                .select(`
                    id,
                    reason_en,
                    reason_ar,
                    month,
                    year,
                    profile:user_id (
                        id,
                        full_name,
                        avatar_url,
                        job_title
                    )
                `)
                .eq('month', currentMonth)
                .eq('year', currentYear)

            const propertyId = currentProperty?.id
            if (propertyId && propertyId !== 'all') {
                queryBuilder = queryBuilder.eq('property_id', propertyId)
            }

            const { data, error } = await queryBuilder.maybeSingle()

            if (error) throw error
            setWinner(data as any)
        } catch (err) {
            console.error('Error fetching EOM winner:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchWinner()
    }, [currentProperty])

    if (loading) {
        return (
            <Card className={cn("overflow-hidden border-2 border-hotel-gold/20", className)}>
                <CardHeader className="pb-2 bg-hotel-gold/5">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-hotel-gold" />
                        <Skeleton className="h-5 w-32" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 flex flex-col items-center text-center">
                    <Skeleton className="h-20 w-20 rounded-full mb-4" />
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-32 mb-4" />
                    <Skeleton className="h-16 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={cn("overflow-hidden border-2 border-hotel-gold/30 shadow-lg hover:shadow-xl transition-shadow duration-300", className)}>
            <CardHeader className="pb-2 bg-gradient-to-r from-hotel-gold/10 via-hotel-gold/5 to-transparent border-b border-hotel-gold/10">
                <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-hotel-gold animate-bounce-slow" />
                        <span className="font-semibold text-hotel-charcoal">{t('widgets.employee_of_the_month.title')}</span>
                    </div>
                    <Badge variant="outline" className="bg-hotel-gold/10 text-hotel-gold border-hotel-gold/20">
                        {new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(new Date())}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6 px-4">
                <AnimatePresence mode="wait">
                    {winner ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center text-center"
                        >
                            <div className="relative mb-4">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    className="absolute -inset-2 rounded-full border border-dashed border-hotel-gold/40"
                                />
                                <Avatar className="h-24 w-24 border-4 border-hotel-gold/20 shadow-inner">
                                    <AvatarImage src={winner.profile.avatar_url || undefined} />
                                    <AvatarFallback className="bg-hotel-gold/10 text-hotel-gold text-2xl font-bold">
                                        {winner.profile.full_name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 bg-hotel-gold rounded-full p-1.5 shadow-md">
                                    <Award className="h-4 w-4 text-white" />
                                </div>
                            </div>

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <h3 className="text-xl font-bold text-hotel-charcoal mb-0.5">{winner.profile.full_name}</h3>
                                <p className="text-hotel-charcoal/60 text-sm font-medium mb-3">{winner.profile.job_title || t('common:labels.team_member')}</p>

                                <div className="relative bg-hotel-gold/5 rounded-xl p-4 border border-hotel-gold/10 italic text-hotel-charcoal/80 text-sm max-w-sm mx-auto">
                                    <Star className="absolute -top-2 -left-2 h-5 w-5 text-hotel-gold fill-hotel-gold opacity-30" />
                                    {i18n.language === 'ar' ? winner.reason_ar : winner.reason_en}
                                    <Star className="absolute -bottom-2 -right-2 h-5 w-5 text-hotel-gold fill-hotel-gold opacity-30" />
                                </div>
                            </motion.div>

                            <div className="mt-6 flex gap-2">
                                <Badge variant="secondary" className="bg-hotel-gold/10 text-hotel-gold hover:bg-hotel-gold/20 cursor-default">
                                    <PartyPopper className="h-3 w-3 me-1" />
                                    {t('widgets.employee_of_the_month.congratulations')}
                                </Badge>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-hotel-charcoal/40">
                            <Star className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-sm font-medium">{t('widgets.employee_of_the_month.no_winner')}</p>
                        </div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    )
}
