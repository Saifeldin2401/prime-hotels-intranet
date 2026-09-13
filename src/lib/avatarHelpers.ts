/**
 * ALTUS Avatar Resolution & Gender Heuristic Utilities
 * 
 * Provides:
 * 1. User-configured avatar_url priority (custom uploaded photo or selected preset).
 * 2. Explicit profile.gender check ('female' vs 'male').
 * 3. Culturally accurate Arabic & English first-name heuristic fallback.
 * 4. User selection of official ALTUS executive presets.
 */

export const ALTUS_AVATAR_PRESETS = {
    male: '/assets/altus/learner-male.jpg',
    female: '/assets/altus/learner-female.jpg',
} as const

const KNOWN_FEMALE_FIRST_NAMES = new Set([
    // English transliterations
    'sarah', 'sara', 'fatima', 'fatimah', 'noura', 'norah', 'reem', 'reemah', 'maryam', 'mariam',
    'mona', 'huda', 'layla', 'laila', 'dania', 'danya', 'maha', 'lama', 'amira', 'ameera',
    'yasmin', 'yasmine', 'salma', 'haifa', 'razan', 'rana', 'dina', 'rasha', 'amal',
    'najla', 'alanoud', 'aljohara', 'hend', 'hind', 'manal', 'dalal', 'latifa', 'shahd',
    'kholoud', 'hannan', 'abeer', 'arwa', 'asma', 'rawan', 'lina', 'nadia', 'ruba',
    'hajar', 'ghada', 'lubna', 'rehab', 'shatha', 'wafa', 'marwa', 'zahra',

    // Arabic original names
    'سارة', 'ساره', 'نورة', 'نوره', 'فاطمة', 'فاطمه', 'مريم', 'ريم', 'ريما', 'منى', 'هدى',
    'ليلى', 'دانية', 'دانيه', 'مها', 'لما', 'أميرة', 'اميرة', 'أميره', 'اميره', 'ياسمين',
    'سلمى', 'هيفاء', 'رزان', 'رنا', 'دينا', 'رشا', 'أمل', 'امل', 'نجلاء', 'العنود',
    'الجوهرة', 'الجوهرة', 'هند', 'منال', 'دلال', 'لطيفة', 'لطيفه', 'شهد', 'خلود', 'حنان',
    'عبير', 'أروى', 'اروى', 'أسماء', 'اسماء', 'روان', 'لينا', 'نادية', 'ناديه', 'ربى',
    'هاجر', 'غادة', 'غاده', 'لبنى', 'رحاب', 'شذى', 'وفاء', 'مروة', 'مروه', 'زهراء'
])

export interface ProfileAvatarInput {
    avatar_url?: string | null
    full_name?: string | null
    gender?: string | null
}

/**
 * Resolves the appropriate avatar URL for an ALTUS user.
 * 
 * Precedence:
 * 1. Explicit avatar_url (custom upload or selected preset)
 * 2. Explicit gender field if present ('female' -> learner-female, 'male' -> learner-male)
 * 3. First name heuristic matching common KSA female names
 * 4. Default to official ALTUS male professional
 */
export function getAltusAvatar(profile?: ProfileAvatarInput | null): string {
    if (profile?.avatar_url && profile.avatar_url.trim().length > 0) {
        return profile.avatar_url.trim()
    }

    const gender = (profile?.gender || '').toLowerCase().trim()
    if (gender === 'female' || gender === 'f' || gender === 'أنثى') {
        return ALTUS_AVATAR_PRESETS.female
    }
    if (gender === 'male' || gender === 'm' || gender === 'ذكر') {
        return ALTUS_AVATAR_PRESETS.male
    }

    // Name-based heuristic fallback
    if (profile?.full_name) {
        const cleanedName = profile.full_name.trim().toLowerCase()
        // Extract first token (ignoring common prefixes like Eng, Dr, Mr, Ms, إلخ)
        const parts = cleanedName
            .replace(/^(dr|mr|ms|mrs|eng|sheikh|أ\.|د\.|م\.|الشيخ|الأستاذ)\s+/i, '')
            .split(/\s+/)

        const firstName = parts[0] || ''
        if (KNOWN_FEMALE_FIRST_NAMES.has(firstName)) {
            return ALTUS_AVATAR_PRESETS.female
        }
    }

    return ALTUS_AVATAR_PRESETS.male
}
