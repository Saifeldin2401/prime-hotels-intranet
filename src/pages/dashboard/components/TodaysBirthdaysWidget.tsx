import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTodaysBirthdays } from '@/hooks/useEmployeeDirectory'
import { cn } from '@/lib/utils'
import { Cake, ChevronRight, Gift, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

function getInitials(name?: string | null) {
  return name
    ? name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    : '??'
}

export function TodaysBirthdaysWidget() {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const { data: birthdays = [], isLoading } = useTodaysBirthdays()

  return (
    <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col h-full">
      <CardHeader className="pb-4 pt-6 px-6 relative z-10 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg">
                <Cake className="w-5 h-5" />
              </div>
              <Link to="/directory" className="hover:text-rose-500 transition-colors">
                {t('widgets.birthdays.title') || "Today's Birthdays"}
              </Link>
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500 mt-1">
              {t('widgets.birthdays.desc') || 'Celebrate team members with birthdays today'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-2 flex-1 bg-slate-50/30">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : birthdays.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 ring-1 ring-slate-100 shadow-sm">
              <Gift className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-600">{t('widgets.birthdays.no_birthdays') || 'No birthdays today'}</p>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {birthdays.slice(0, 6).map((person) => (
              <div key={person.id} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_2px_8px_rgb(0,0,0,0.02)] hover:shadow-md hover:border-rose-100 transition-all group">
                <Avatar className="h-10 w-10 ring-1 ring-slate-100 shadow-sm">
                  <AvatarImage src={person.avatar_url || ''} />
                  <AvatarFallback className="text-xs font-bold bg-rose-50 text-rose-600">{getInitials(person.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[14px] text-slate-800 truncate group-hover:text-rose-600 transition-colors">{person.full_name}</div>
                  <div className="text-xs font-medium text-slate-500 truncate mt-0.5">
                    {person.job_title || 'Team Member'}
                    {person.property_name ? <span className="opacity-70"> • {person.property_name}</span> : ''}
                  </div>
                </div>
                {person.age ? (
                  <Badge variant="outline" className="border-rose-100 bg-rose-50 text-rose-600 font-bold px-2 rounded-lg">
                    {person.age}
                  </Badge>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full mt-5 font-bold text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 border-slate-200 rounded-xl rounded-tr-xl"
          onClick={() => navigate('/directory')}
        >
          <Gift className="w-4 h-4 mr-2 text-rose-500" />
          Open Directory
          <ChevronRight className={cn("w-4 h-4 ml-auto", isRTL && "rotate-180")} />
        </Button>
      </CardContent>
    </Card>
  )
}

export default TodaysBirthdaysWidget
