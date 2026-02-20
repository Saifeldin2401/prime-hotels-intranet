import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Trophy, Medal, Quote, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'

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
    const isRTL = i18n.dir() === 'rtl'

    const { data: winners, isLoading } = useQuery({
        queryKey: ['employee-of-month-widget'],
        queryFn: async () => {
            const now = new Date()
            // Get current month or previous month if current not set yet
            // Actually let's just get the latest one

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
        <Card className="h-full overflow-hidden relative border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background">
            <div className="absolute top-0 right-0 p-3 opacity-10">
                <Trophy className="w-24 h-24 text-amber-500" />
            </div>

            <CardHeader className="pb-2">
                <div className="flex items-center justify-between z-10">
                    <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        {t('widgets.employeeOfMonth.title', 'Employee of the Month')}
                    </CardTitle>
                    {winner && (
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                            {formatMonth(winner.month, winner.year)}
                        </span>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-6 space-y-4">
                        <Skeleton className="w-24 h-24 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                ) : winner ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center text-center relative z-10"
                    >
                        <div className="relative mb-4">
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 rounded-full blur opacity-75"></div>
                            <Avatar className="w-24 h-24 border-4 border-white dark:border-amber-900 shadow-xl relative cursor-pointer hover:scale-105 transition-transform duration-300"
                                onClick={() => window.location.href = `/profile/${winner.user.id}`}>
                                <AvatarImage src={winner.user.avatar_url || undefined} alt={winner.user.full_name} className="object-cover" />
                                <AvatarFallback className="bg-amber-100 text-amber-700 text-2xl">
                                    {winner.user.full_name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white dark:border-gray-900">
                                <Medal className="w-4 h-4" />
                            </div>
                        </div>

                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">
                            {winner.user.full_name}
                        </h3>

                        <div className="flex flex-col items-center gap-1 mb-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                {winner.user.job_title}
                            </p>
                        </div>

                        {winner.reason && (
                            <div className="relative bg-white/60 dark:bg-black/20 p-4 rounded-lg text-sm italic text-gray-600 dark:text-gray-300 w-full shadow-sm border border-amber-100 dark:border-amber-900/30">
                                <Quote className={`absolute top-2 ${isRTL ? 'right-2' : 'left-2'} w-3 h-3 text-amber-400 opacity-50`} />
                                <p className="px-2 line-clamp-3">"{winner.reason}"</p>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
                        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-3">
                            <User className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium">{t('widgets.employeeOfMonth.empty', 'No winner announced yet')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
