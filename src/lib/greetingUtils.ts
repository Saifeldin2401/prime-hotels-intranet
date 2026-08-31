export function getTimeBasedGreeting(tOrLang?: ((key: string, fallback?: string, options?: Record<string, unknown>) => string) | string) {
    const hour = new Date().getHours()
    let key = 'good_morning'
    let fallbackGreeting = 'Good morning'
    let fallbackGreetingAr = 'صباح الخير'
    let fallbackSubtitle = 'Wish you a productive day in hospitality operations!'
    let fallbackSubtitleAr = 'نتمنى لك يوماً مثمراً وموفقاً في إدارة العمليات الفندقية'
    let emoji = '🌅'

    if (hour >= 5 && hour < 12) {
        key = 'good_morning'
        fallbackGreeting = 'Good morning'
        fallbackGreetingAr = 'صباح الخير'
        fallbackSubtitle = 'Wish you a productive day in hospitality operations!'
        fallbackSubtitleAr = 'نتمنى لك يوماً مثمراً وموفقاً في إدارة العمليات الفندقية'
        emoji = '🌅'
    } else if (hour >= 12 && hour < 17) {
        key = 'good_afternoon'
        fallbackGreeting = 'Good afternoon'
        fallbackGreetingAr = 'مساء الخير'
        fallbackSubtitle = "Here's your mid-day operational and property update."
        fallbackSubtitleAr = 'إليك ملخص العمليات ومنتصف اليوم الفندقي'
        emoji = '☀️'
    } else if (hour >= 17 && hour < 22) {
        key = 'good_evening'
        fallbackGreeting = 'Good evening'
        fallbackGreetingAr = 'مساء الخير والتميز'
        fallbackSubtitle = "Reviewing today's hotel performance and achievements."
        fallbackSubtitleAr = 'استعراض أداء اليوم وإنجازات فريق الضيافة'
        emoji = '🌇'
    } else {
        key = 'good_night'
        fallbackGreeting = 'Good night'
        fallbackGreetingAr = 'طاب مساؤكم'
        fallbackSubtitle = 'Night shift overview and active hotel monitoring.'
        fallbackSubtitleAr = 'ملخص الوردية الليلية ومتابعة جودة الضيافة'
        emoji = '🌙'
    }

    let greetingText = fallbackGreeting
    let subtitleText = fallbackSubtitle

    if (typeof tOrLang === 'function') {
        greetingText = tOrLang(`welcome_header.${key}`, fallbackGreeting)
        subtitleText = tOrLang(`welcome_header.${key}_subtitle`, fallbackSubtitle)
    } else if (typeof tOrLang === 'string' && tOrLang.startsWith('ar')) {
        greetingText = fallbackGreetingAr
        subtitleText = fallbackSubtitleAr
    }

    return {
        greetingText,
        subtitleText,
        emoji,
        hour
    }
}
