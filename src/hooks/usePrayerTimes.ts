import { useProperty } from '@/contexts/PropertyContext'
import { useQuery } from '@tanstack/react-query'

export interface PrayerTimes {
    Fajr: string
    Dhuhr: string
    Asr: string
    Maghrib: string
    Isha: string
    NextPrayer: string
    NextPrayerTime: string
    Countdown: string
}

export function usePrayerTimes() {
    const { currentProperty } = useProperty()

    // Default to Riyadh if no coordinates
    const lat = currentProperty?.latitude || 24.7136
    const lng = currentProperty?.longitude || 46.6753

    return useQuery({
        queryKey: ['prayer-times', lat, lng],
        queryFn: async (): Promise<PrayerTimes> => {
            // Using Aladhan API - Umm al-Qura (Method 4)
            const date = new Date()
            const day = date.getDate()
            const month = date.getMonth() + 1
            const year = date.getFullYear()

            const response = await fetch(
                `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=4`
            )

            if (!response.ok) throw new Error('Failed to fetch prayer times')

            const data = await response.json()
            const timings = data.data.timings

            const mainPrayers = {
                Fajr: timings.Fajr,
                Dhuhr: timings.Dhuhr,
                Asr: timings.Asr,
                Maghrib: timings.Maghrib,
                Isha: timings.Isha
            }

            // Calculate Next Prayer
            const now = new Date()
            const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
            let nextPrayer = ''
            let nextTimeStr = ''
            let nextTime: Date | null = null

            for (const name of prayerNames) {
                const [hours, minutes] = timings[name].split(':')
                const pTime = new Date(now)
                pTime.setHours(parseInt(hours), parseInt(minutes), 0)

                if (pTime > now) {
                    nextPrayer = name
                    nextTimeStr = timings[name]
                    nextTime = pTime
                    break
                }
            }

            // Fallback to tomorrow's Fajr if all prayers passed today
            if (!nextPrayer) {
                nextPrayer = 'Fajr'
                nextTimeStr = timings.Fajr
                // For simplicity in the hook, we just label it Fajr
            }

            // Simple Countdown logic (will be updated by component if needed)
            let countdown = '--:--'
            if (nextTime) {
                const diff = nextTime.getTime() - now.getTime()
                const mins = Math.floor(diff / 1000 / 60)
                const h = Math.floor(mins / 60)
                const m = mins % 60
                countdown = `${h}h ${m}m`
            }

            return {
                ...mainPrayers,
                NextPrayer: nextPrayer,
                NextPrayerTime: nextTimeStr,
                Countdown: countdown
            }
        },
        retry: (failureCount, error) => {
            const message = error instanceof Error ? error.message.toLowerCase() : ''
            if (
                message.includes('content security policy') ||
                message.includes('refused to connect') ||
                message.includes('violates')
            ) {
                return false
            }
            return failureCount < 2
        },
        refetchInterval: 60000 * 30, // Refetch every 30 mins
        staleTime: 60000 * 15
    })
}
