import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { Trophy, Medal, Quote, User, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

interface Winner {
    id: string
    user_id: string
    month: number
    year: number
    reason: string
    user: {
        id: string
        full_name: string
        avatar_url: string | null
        job_title: string | null
    }
}

export function EmployeeOfMonthWidget() {
    const { t, i18n } = useTranslation('dashboard')
    const navigate = useNavigate()
    const isRTL = i18n.dir() === 'rtl'

    const { data: winners, isLoading } = useQuery({
        queryKey: ['employee-of-month-widget'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('employee_of_the_month')
                .select(`
          *,
          user:profiles!employee_of_the_month_user_id_fkey(
            id,
            full_name,
            avatar_url,
            job_title
          )
        `)
                .order('year', { ascending: false })
                .order('month', { ascending: false })
                .limit(1)

            if (error) throw error
            return data as Winner[]
        }
    })

    // Format month name
    const formatMonth = (month: number, year: number) => {
        const date = new Date(year, month - 1)
        return new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(date)
    }

    const winner = winners?.[0]

    return (
        <LazyMotion features={domAnimation}>
            <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden relative flex flex-col h-full group">
                {/* Very subtle background icon for premium depth */}
                <div className="absolute -top-4 -right-4 p-3 opacity-[0.03] rotate-12 pointer-events-none transition-transform duration-700 group-hover:rotate-[24deg] group-hover:scale-110">
                    <Trophy className="w-48 h-48 text-amber-500" />
                </div>

                <CardHeader className="pb-4 pt-6 px-6 relative z-10 border-b border-slate-100/50">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                            <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg">
                                <Trophy className="w-5 h-5" />
                            </div>
                            {t('widgets.employee_of_the_month.title', 'Employee of the Month')}
                        </CardTitle>
                        {winner && (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                {formatMonth(winner.month, winner.year)}
                            </span>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="px-6 pb-6 pt-6 flex-1 flex flex-col justify-center relative bg-slate-50/20">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-6 space-y-4">
                            <Skeleton className="w-24 h-24 rounded-full" />
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-28" />
                        </div>
                    ) : winner ? (
                        <m.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center text-center relative z-10"
                        >
                            <div className="relative mb-5 group">
                                <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 rounded-full blur-md opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/profile/${winner.user.id}`)}
                                    className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                                    aria-label={`Open profile for ${winner.user.full_name}`}
                                >
                                    <Avatar className="w-24 h-24 border-[3px] border-white shadow-md relative cursor-pointer ring-1 ring-slate-100 hover:scale-105 transition-transform duration-300">
                                        <AvatarImage src={winner.user.avatar_url || undefined} alt={winner.user.full_name} className="object-cover" />
                                        <AvatarFallback className="bg-amber-50 text-amber-600 text-2xl font-bold">
                                            {winner.user.full_name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </button>
                                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1.5 rounded-full shadow-lg border-[3px] border-white">
                                    <Medal className="w-4 h-4" />
                                </div>
                            </div>

                            <button
                                type="button"
                                className="font-extrabold text-xl text-slate-800 mb-1 hover:text-amber-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                                onClick={() => navigate(`/profile/${winner.user.id}`)}
                            >
                                {winner.user.full_name}
                            </button>

                            <div className="flex flex-col items-center gap-1 mb-5">
                                <p className="text-[13px] text-slate-500 font-bold tracking-wide uppercase">
                                    {winner.user.job_title}
                                </p>
                            </div>

                            {winner.reason ? (
                                <div className="relative bg-white p-5 rounded-2xl text-[14px] italic text-slate-600 w-full shadow-[0_2px_10px_rgb(0,0,0,0.03)] border border-slate-100 hover:border-amber-100 hover:shadow-[0_4px_12px_rgb(0,0,0,0.04)] transition-all">
                                    <Quote className={cn("absolute top-3 w-4 h-4 text-amber-200 opacity-70", isRTL ? 'right-3 -scale-x-100' : 'left-3')} />
                                    <p className="px-4 line-clamp-3 leading-relaxed font-serif">"{winner.reason}"</p>
                                </div>
                            ) : null}

                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full mt-4 font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-10 rounded-xl transition-colors"
                                onClick={() => navigate(`/profile/${winner.user.id}`)}
                            >
                                Congratulate
                                <ChevronRight className={cn("w-4 h-4 ml-1", isRTL && "rotate-180")} />
                            </Button>
                        </m.div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500">
                            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-4 shadow-sm">
                                <User className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-600">{t('widgets.employee_of_the_month.no_winner', 'No winner announced yet')}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </LazyMotion>
    )
}
