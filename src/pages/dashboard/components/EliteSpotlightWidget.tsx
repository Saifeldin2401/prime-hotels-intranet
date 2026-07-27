import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProperty } from '@/contexts/PropertyContext'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, m } from 'framer-motion'
import { Award, Cake, CalendarDays, ChevronLeft, ChevronRight, Gift, Star, Trophy, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SpotlightItem {
  id: string
  type: 'eom' | 'anniversary' | 'achievement' | 'birthday' | 'event'
  name: string
  property: string
  title: string
  image?: string | null
  date: string
  description?: string
}

interface EomRow {
  id: string
  user_id: string
  property_id: string | null
  month: number
  year: number
  reason_en: string | null
  reason_ar: string | null
}

interface AnniversaryRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  job_title: string | null
  hire_date: string | null
}

interface AchievementRow {
  id: string
  user_id: string
  title: string | null
  description: string | null
  earned_at: string
}

interface BirthdayRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  job_title: string | null
  date_of_birth: string | null
}

interface EventRow {
  id: string
  title: string
  type: string
  start_date: string
  property_id: string | null
}

interface ProfileLite {
  id: string
  full_name: string | null
  avatar_url: string | null
  job_title: string | null
}

interface PropertyLite {
  id: string
  name: string
}

const startOfToday = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const getCompletedYears = (hireDate: Date, now: Date) => {
  let years = now.getFullYear() - hireDate.getFullYear()
  const isBeforeAnniversary =
    now.getMonth() < hireDate.getMonth() ||
    (now.getMonth() === hireDate.getMonth() && now.getDate() < hireDate.getDate())
  if (isBeforeAnniversary) years -= 1
  return years
}

const formatMonthYear = (year: number, month: number, locale: string) =>
  new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))

const formatDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value))

export function EliteSpotlightWidget() {
  const { t, i18n } = useTranslation('dashboard')
  const { currentProperty } = useProperty()
  const [index, setIndex] = useState(0)

  const { data: spotlightItems = [], isLoading } = useQuery({
    queryKey: ['elite-spotlight', currentProperty?.id, i18n.language],
    queryFn: async (): Promise<SpotlightItem[]> => {
      const propertyId = currentProperty?.id
      const isScoped = isRealPropertyId(propertyId)
      const defaultPropertyName = currentProperty?.name || t('spotlight.company', 'Altus Advisory')
      const now = new Date()
      const today = startOfToday(now)

      let scopedUserIds: string[] = []
      if (isScoped && propertyId) {
        const { data: propUsers, error: propUsersError } = await supabase
          .from('user_properties')
          .select('user_id')
          .eq('property_id', propertyId)

        if (propUsersError) {
          console.warn('Elite spotlight: failed to load property users', propUsersError)
        } else {
          scopedUserIds = (propUsers || []).map((row: { user_id: string }) => row.user_id)
        }
      }

      const getEomRows = async (): Promise<EomRow[]> => {
        let q = supabase
          .from('employee_of_the_month')
          .select('id, user_id, property_id, month, year, reason_en, reason_ar')
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(3)

        if (isScoped && propertyId) {
          q = q.eq('property_id', propertyId)
        }

        const { data, error } = await q
        if (error) {
          console.warn('Elite spotlight: failed to load employee of month', error)
          return []
        }
        return (data || []) as EomRow[]
      }

      const getAnniversaryRows = async (): Promise<AnniversaryRow[]> => {
        let q = supabase
          .from('profiles')
          .select('id, full_name, avatar_url, job_title, hire_date')
          .eq('is_active', true)
          .not('hire_date', 'is', null)
          .limit(100)

        if (isScoped) {
          if (scopedUserIds.length === 0) return []
          q = q.in('id', scopedUserIds)
        }

        const { data, error } = await q
        if (error) {
          console.warn('Elite spotlight: failed to load anniversaries', error)
          return []
        }
        return (data || []) as AnniversaryRow[]
      }

      const getAchievementRows = async (): Promise<AchievementRow[]> => {
        let q = supabase
          .from('user_achievements')
          .select('id, user_id, title, description, earned_at')
          .order('earned_at', { ascending: false })
          .limit(10)

        if (isScoped) {
          if (scopedUserIds.length === 0) return []
          q = q.in('user_id', scopedUserIds)
        }

        const { data, error } = await q
        if (error) {
          console.warn('Elite spotlight: failed to load achievements', error)
          return []
        }
        return (data || []) as AchievementRow[]
      }

      const getBirthdayRows = async (): Promise<BirthdayRow[]> => {
        let q = supabase
          .from('profiles')
          .select('id, full_name, avatar_url, job_title, date_of_birth')
          .eq('is_active', true)
          .not('date_of_birth', 'is', null)
          .limit(100)

        if (isScoped) {
          if (scopedUserIds.length === 0) return []
          q = q.in('id', scopedUserIds)
        }

        const { data, error } = await q
        if (error) {
          console.warn('Elite spotlight: failed to load birthdays', error)
          return []
        }
        return (data || []) as BirthdayRow[]
      }

      const getEventRows = async (): Promise<EventRow[]> => {
        let q = supabase
          .from('events')
          .select('id, title, type, start_date, property_id')
          .eq('is_public', true)
          .gte('start_date', now.toISOString())
          .order('start_date', { ascending: true })
          .limit(5)

        if (isScoped && propertyId) {
          q = q.or(`property_id.is.null,property_id.eq.${propertyId}`)
        }

        const { data, error } = await q
        if (error) {
          console.warn('Elite spotlight: failed to load events', error)
          return []
        }
        return (data || []) as EventRow[]
      }

      const [eomRows, anniversaryRows, achievementRows, birthdayRows, eventRows] = await Promise.all([
        getEomRows(),
        getAnniversaryRows(),
        getAchievementRows(),
        getBirthdayRows(),
        getEventRows()
      ])

      const profileIds = Array.from(
        new Set(
          [...eomRows.map((row) => row.user_id), ...achievementRows.map((row) => row.user_id)].filter(Boolean)
        )
      )
      const propertyIds = Array.from(
        new Set(eomRows.map((row) => row.property_id).filter((value): value is string => !!value))
      )

      let profileMap = new Map<string, ProfileLite>()
      if (profileIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, job_title')
          .in('id', profileIds)

        if (error) {
          console.warn('Elite spotlight: failed to load profile details', error)
        } else {
          profileMap = new Map((data || []).map((row: ProfileLite) => [row.id, row]))
        }
      }

      let propertyMap = new Map<string, PropertyLite>()
      if (propertyIds.length > 0) {
        const { data, error } = await supabase
          .from('properties')
          .select('id, name')
          .in('id', propertyIds)

        if (error) {
          console.warn('Elite spotlight: failed to load property details', error)
        } else {
          propertyMap = new Map((data || []).map((row: PropertyLite) => [row.id, row]))
        }
      }

      const items: SpotlightItem[] = []

      const latestEom = eomRows[0]
      if (latestEom) {
        const user = profileMap.get(latestEom.user_id)
        if (user?.full_name) {
          items.push({
            id: `eom-${latestEom.id}`,
            type: 'eom',
            name: user.full_name,
            property: latestEom.property_id
              ? propertyMap.get(latestEom.property_id)?.name || defaultPropertyName
              : defaultPropertyName,
            title: user.job_title || t('spotlight.member', 'Team Member'),
            image: user.avatar_url,
            date: formatMonthYear(latestEom.year, latestEom.month, i18n.language),
            description:
              latestEom.reason_en ||
              latestEom.reason_ar ||
              t('spotlight.no_reason', 'Recognized for outstanding contribution.')
          })
        }
      }

      const anniversaryCandidate = anniversaryRows
        .map((row) => {
          if (!row.hire_date || !row.full_name) return null
          const hireDate = new Date(row.hire_date)
          if (Number.isNaN(hireDate.getTime())) return null
          const years = getCompletedYears(hireDate, now)
          if (years < 1) return null

          const anniversaryDate = new Date(now.getFullYear(), hireDate.getMonth(), hireDate.getDate())
          const diffDays = Math.abs(Math.round((startOfToday(anniversaryDate).getTime() - today.getTime()) / 86400000))

          return { row, years, diffDays }
        })
        .filter((entry): entry is { row: AnniversaryRow; years: number; diffDays: number } => entry !== null)
        .sort((a, b) => a.diffDays - b.diffDays)[0]

      if (anniversaryCandidate) {
        const yearsLabel =
          anniversaryCandidate.years === 1
            ? t('spotlight.anniversary.one_year', '1 Year Anniversary')
            : t('spotlight.anniversary.years', {
                count: anniversaryCandidate.years,
                defaultValue: `${anniversaryCandidate.years} Year Anniversary`
              })

        items.push({
          id: `anniversary-${anniversaryCandidate.row.id}`,
          type: 'anniversary',
          name: anniversaryCandidate.row.full_name || t('spotlight.member', 'Team Member'),
          property: defaultPropertyName,
          title: anniversaryCandidate.row.job_title || t('spotlight.member', 'Team Member'),
          image: anniversaryCandidate.row.avatar_url,
          date: yearsLabel,
          description: t(
            'spotlight.anniversary.description',
            'Celebrating dedication and consistent service excellence.'
          )
        })
      }

      const latestAchievement = achievementRows[0]
      if (latestAchievement) {
        const user = profileMap.get(latestAchievement.user_id)
        if (user?.full_name) {
          const earnedLabel = formatDate(latestAchievement.earned_at, i18n.language)
          items.push({
            id: `achievement-${latestAchievement.id}`,
            type: 'achievement',
            name: user.full_name,
            property: defaultPropertyName,
            title: latestAchievement.title || user.job_title || t('spotlight.achievement', 'Achievement'),
            image: user.avatar_url,
            date: t('spotlight.achievement_date', {
              date: earnedLabel,
              defaultValue: `Awarded ${earnedLabel}`
            }),
            description:
              latestAchievement.description ||
              t('spotlight.achievement_description', 'Recognized for outstanding performance.')
          })
        }
      }

      const birthdayCandidate = birthdayRows
        .map((row) => {
          if (!row.date_of_birth || !row.full_name) return null
          const dobParts = row.date_of_birth.split('-')
          if (dobParts.length < 3) return null
          const month = parseInt(dobParts[1], 10) - 1
          const day = parseInt(dobParts[2], 10)
          
          let upcomingBirthday = new Date(now.getFullYear(), month, day)
          
          if (startOfToday(upcomingBirthday).getTime() < today.getTime()) {
            upcomingBirthday = new Date(now.getFullYear() + 1, month, day)
          }

          const diffDays = Math.round((startOfToday(upcomingBirthday).getTime() - today.getTime()) / 86400000)
          
          if (diffDays > 30) return null 
          return { row, upcomingBirthday, diffDays }
        })
        .filter((entry): entry is { row: BirthdayRow; upcomingBirthday: Date; diffDays: number } => entry !== null)
        .sort((a, b) => a.diffDays - b.diffDays)[0]

      if (birthdayCandidate) {
        const dateLabel = formatDate(birthdayCandidate.upcomingBirthday.toISOString(), i18n.language)
        const daysUntil = birthdayCandidate.diffDays === 0 
          ? t('spotlight.birthday.today', 'Today!')
          : t('spotlight.birthday.upcoming', { date: dateLabel, defaultValue: `Coming up on ${dateLabel}` })

        items.push({
          id: `birthday-${birthdayCandidate.row.id}`,
          type: 'birthday',
          name: birthdayCandidate.row.full_name || t('spotlight.member', 'Team Member'),
          property: defaultPropertyName,
          title: birthdayCandidate.row.job_title || t('spotlight.member', 'Team Member'),
          image: birthdayCandidate.row.avatar_url,
          date: daysUntil,
          description: t(
            'spotlight.birthday.description',
            'Wishing you a fantastic birthday and a wonderful year ahead from the Altus Advisory team!'
          )
        })
      }

      const upcomingEvent = eventRows[0]
      if (upcomingEvent) {
        const eventDate = new Date(upcomingEvent.start_date)
        const diffDays = Math.round((startOfToday(eventDate).getTime() - today.getTime()) / 86400000)
        
        const dateLabel = formatDate(upcomingEvent.start_date, i18n.language)
        const daysUntil = diffDays === 0 
          ? t('spotlight.event.today', 'Today!')
          : t('spotlight.event.upcoming', { date: dateLabel, defaultValue: dateLabel })

        items.push({
          id: `event-${upcomingEvent.id}`,
          type: 'event',
          name: upcomingEvent.title,
          property: upcomingEvent.property_id ? propertyMap.get(upcomingEvent.property_id)?.name || defaultPropertyName : t('spotlight.event.company_wide', 'Company Wide'),
          title: upcomingEvent.type.charAt(0).toUpperCase() + upcomingEvent.type.slice(1),
          image: null, 
          date: daysUntil,
          description: t(
            'spotlight.event.description',
            'Important upcoming event in your calendar. Save the date!'
          )
        })
      }

      return items
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 15
  })

  const itemCount = spotlightItems.length

  useEffect(() => {
    if (itemCount === 0) {
      setIndex(0)
      return
    }
    setIndex((prev) => prev % itemCount)
  }, [itemCount])

  useEffect(() => {
    if (itemCount <= 1) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % itemCount)
    }, 8000)
    return () => clearInterval(timer)
  }, [itemCount])

  const current = spotlightItems[index]

  const typeConfig = {
    eom: { icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Employee of the Month' },
    anniversary: { icon: Gift, color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Work Anniversary' },
    achievement: { icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Pride Achievement' },
    birthday: { icon: Cake, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', label: 'Birthday Celebration' },
    event: { icon: CalendarDays, color: 'text-cyan-500', bg: 'bg-cyan-500/10', label: 'Upcoming Event' }
  }

  const { icon: Icon, color, bg, label } = current ? typeConfig[current.type] : typeConfig.achievement

  return (
    <Card className="h-full border-0 relative overflow-hidden rounded-2xl bg-[#0f172a] group">
      <div className="absolute top-0 end-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 start-0 w-32 h-32 bg-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

      <CardContent className="h-full p-6 flex flex-col relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {t('spotlight.featured', 'Elite Spotlight')}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-white"
              onClick={() => itemCount > 0 && setIndex((prev) => (prev - 1 + itemCount) % itemCount)}
              disabled={itemCount <= 1}
              aria-label={t('accessibility.previous_spotlight', 'Previous spotlight')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-white"
              onClick={() => itemCount > 0 && setIndex((prev) => (prev + 1) % itemCount)}
              disabled={itemCount <= 1}
              aria-label={t('accessibility.next_spotlight', 'Next spotlight')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4 pt-2">
            <Skeleton className="h-16 w-16 rounded-2xl bg-white/10" />
            <Skeleton className="h-6 w-56 bg-white/10" />
            <Skeleton className="h-4 w-40 bg-white/10" />
            <Skeleton className="h-20 w-full bg-white/10" />
          </div>
        ) : itemCount === 0 || !current ? (
          <div className="flex-1 flex items-center justify-center text-center px-2">
            <p className="text-sm font-medium text-slate-400">
              {t('spotlight.empty', 'No spotlight highlights available yet.')}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <m.div
              key={current.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5, ease: 'circOut' }}
              className="flex-1 flex flex-col pt-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/10 p-0.5 shadow-2xl">
                    <div className="w-full h-full rounded-[14px] bg-slate-800 flex items-center justify-center overflow-hidden">
                      {current.image ? (
                        <img src={current.image} alt={current.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-slate-600" />
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      'absolute -bottom-1 -end-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-[#0f172a] shadow-lg',
                      bg
                    )}
                  >
                    <Icon className={cn('w-3.5 h-3.5', color)} />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-black text-white leading-tight">{current.name}</h3>
                  <p className="text-[11px] font-bold text-slate-400 truncate max-w-[220px]">
                    {current.title} - {current.property}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <div className={cn('w-1.5 h-1.5 rounded-full shadow-[0_0_8px]', color.replace('text-', 'bg-'))} />
                  <span className="text-[10px] font-black text-white uppercase tracking-wider">
                    {t(`spotlight.label.${current.type}`, label)}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-300 italic leading-relaxed">"{current.description}"</p>

                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{current.date}</div>
              </div>
            </m.div>
          </AnimatePresence>
        )}

        {itemCount > 1 && (
          <div className="mt-6 flex justify-center gap-1.5">
            {spotlightItems.map((item, i) => (
              <button
                type="button"
                key={item.id}
                className={cn(
                  'h-1 rounded-full transition-all duration-500',
                  index === i ? 'w-6 bg-amber-400' : 'w-1.5 bg-slate-700'
                )}
                onClick={() => setIndex(i)}
                aria-label={`Show spotlight ${i + 1}`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
