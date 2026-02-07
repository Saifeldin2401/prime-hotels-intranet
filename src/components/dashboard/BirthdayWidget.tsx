import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Cake, PartyPopper, Gift, Calendar, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useProperty } from '@/contexts/PropertyContext'
import { format, addDays, isSameDay } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'

interface BirthdayProfile {
    id: string
    full_name: string
    avatar_url: string | null
    job_title: string | null
    date_of_birth: string
}

interface BirthdayWidgetProps {
    className?: string
    compact?: boolean
}

export function BirthdayWidget({ className, compact = false }: BirthdayWidgetProps) {
    const { t, i18n } = useTranslation('dashboard')
    const { currentProperty } = useProperty()
    const [birthdays, setBirthdays] = useState<BirthdayProfile[]>([])
    const [loading, setLoading] = useState(true)

    const fetchBirthdays = async () => {
        try {
            const propertyId = currentProperty?.id
            const isAll = !propertyId || propertyId === 'all'

            let queryBuilder = supabase
                .from('profiles')
                .select(`
                    id, 
                    full_name, 
                    avatar_url, 
                    job_title, 
                    date_of_birth,
                    user_properties${isAll ? '' : '!inner'}(property_id)
                `)
                .not('date_of_birth', 'is', null)
                .eq('is_active', true)

            if (!isAll && propertyId) {
                queryBuilder = queryBuilder.eq('user_properties.property_id', propertyId)
            }

            const { data, error } = await queryBuilder

            if (error) throw error

            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            const next7Days = addDays(today, 7)

            const upcoming = (data as BirthdayProfile[]).filter(profile => {
                const dob = new Date(profile.date_of_birth)
                const thisYearBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())

                // Handle year wrap-around for birthdays early next year
                if (thisYearBday < today) {
                    thisYearBday.setFullYear(today.getFullYear() + 1)
                }

                return thisYearBday >= today && thisYearBday <= next7Days
            }).sort((a, b) => {
                const bdayA = new Date(a.date_of_birth)
                const bdayB = new Date(b.date_of_birth)
                const d1 = new Date(today.getFullYear(), bdayA.getMonth(), bdayA.getDate())
                const d2 = new Date(today.getFullYear(), bdayB.getMonth(), bdayB.getDate())
                if (d1 < today) d1.setFullYear(today.getFullYear() + 1)
                if (d2 < today) d2.setFullYear(today.getFullYear() + 1)
                return d1.getTime() - d2.getTime()
            })

            setBirthdays(upcoming)
        } catch (err) {
            console.error('Error fetching birthdays:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBirthdays()
    }, [currentProperty?.id])

    const getBirthdayLabel = (dobStr: string) => {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const dob = new Date(dobStr)
        const thisYearBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())

        if (thisYearBday < today) thisYearBday.setFullYear(today.getFullYear() + 1)

        if (isSameDay(thisYearBday, today)) {
            return t('widgets.birthdays.today')
        }

        const tomorrow = addDays(today, 1)
        if (isSameDay(thisYearBday, tomorrow)) {
            return t('widgets.birthdays.tomorrow')
        }

        const diffDays = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return t('widgets.birthdays.in_days', { count: diffDays })
    }

    if (loading) {
        return (
            <Card className={cn("border-hotel-pink/20", className)}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Cake className="h-5 w-5 text-hotel-pink" />
                        <Skeleton className="h-5 w-32" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1">
                                <Skeleton className="h-4 w-24 mb-1" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={cn("border-hotel-pink/20 hover:border-hotel-pink/40 transition-colors duration-300 shadow-sm", className)}>
            <CardHeader className={cn("pb-2", compact && "py-3")}>
                <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Cake className="h-5 w-5 text-hotel-pink" />
                        <span className="font-semibold text-hotel-charcoal">{t('widgets.birthdays.title')}</span>
                    </div>
                    {birthdays.length > 0 && (
                        <Badge variant="outline" className="bg-hotel-pink/5 text-hotel-pink border-hotel-pink/20 animate-pulse">
                            {birthdays.length}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className={cn("pt-2", compact && "pb-3")}>
                <div className="space-y-1">
                    <AnimatePresence mode="popLayout">
                        {birthdays.length > 0 ? (
                            birthdays.map((profile, index) => (
                                <motion.div
                                    key={profile.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-hotel-pink/5 group cursor-pointer transition-colors"
                                >
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-hotel-pink/10">
                                            <AvatarImage src={profile.avatar_url || undefined} />
                                            <AvatarFallback className="bg-hotel-pink/5 text-hotel-pink">
                                                {(profile.full_name || '?').charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -top-1 -right-1 bg-white rounded-full shadow-sm">
                                            <PartyPopper className="h-3 w-3 text-hotel-pink" />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-hotel-charcoal truncate group-hover:text-hotel-pink transition-colors">
                                            {profile.full_name}
                                        </h4>
                                        <p className="text-xs text-hotel-charcoal/50 truncate">
                                            {profile.job_title || t('common:labels.team_member')}
                                        </p>
                                    </div>

                                    <div className="text-end shrink-0">
                                        <Badge variant="outline" className={cn(
                                            "text-[10px] font-bold px-1.5 h-5",
                                            getBirthdayLabel(profile.date_of_birth) === t('widgets.birthdays.today')
                                                ? "bg-hotel-pink text-white border-hotel-pink"
                                                : "bg-hotel-pink/5 text-hotel-pink border-hotel-pink/20"
                                        )}>
                                            {getBirthdayLabel(profile.date_of_birth)}
                                        </Badge>
                                        <p className="text-[10px] text-hotel-charcoal/30 mt-0.5 font-medium uppercase tracking-wider">
                                            {format(new Date(profile.date_of_birth), 'MMM dd', { locale: i18n.language === 'ar' ? ar : enUS })}
                                        </p>
                                    </div>

                                    {!compact && (
                                        <ChevronRight className="h-4 w-4 text-hotel-charcoal/20 group-hover:text-hotel-pink/40 transition-colors" />
                                    )}
                                </motion.div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-hotel-charcoal/30">
                                <Gift className="h-10 w-10 mb-2 opacity-10" />
                                <p className="text-xs font-medium">{t('widgets.birthdays.no_birthdays')}</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </CardContent>
        </Card>
    )
}
