export function getTimeBasedGreeting(t: (key: string, fallback: string, options?: Record<string, unknown>) => string) {
    const hour = new Date().getHours()
    let key = 'good_morning'
    let fallbackGreeting = 'Good morning'
    let fallbackSubtitle = 'Wish you a productive day in hospitality operations!'
    let emoji = '🌅'

    if (hour >= 5 && hour < 12) {
        key = 'good_morning'
        fallbackGreeting = 'Good morning'
        fallbackSubtitle = 'Wish you a productive day in hospitality operations!'
        emoji = '🌅'
    } else if (hour >= 12 && hour < 17) {
        key = 'good_afternoon'
        fallbackGreeting = 'Good afternoon'
        fallbackSubtitle = "Here's your mid-day operational and property update."
        emoji = '☀️'
    } else if (hour >= 17 && hour < 22) {
        key = 'good_evening'
        fallbackGreeting = 'Good evening'
        fallbackSubtitle = "Reviewing today's hotel performance and achievements."
        emoji = '🌇'
    } else {
        key = 'good_night'
        fallbackGreeting = 'Good night'
        fallbackSubtitle = 'Night shift overview and active hotel monitoring.'
        emoji = '🌙'
    }

    const greetingText = t(`welcome_header.${key}`, fallbackGreeting)
    const subtitleText = t(`welcome_header.${key}_subtitle`, fallbackSubtitle)

    return {
        greetingText,
        subtitleText,
        emoji,
        hour
    }
}
