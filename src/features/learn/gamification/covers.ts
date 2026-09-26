/**
 * Course cover art.
 *
 * Courses have no uploaded image, so each one gets a photograph from the Altus
 * library chosen by what the course is about (category, English and Arabic keywords),
 * rotating deterministically through category pools so sibling courses within the
 * same category look diverse and visually balanced, while never assigning completely
 * unrelated covers (like a valet car for an HR course).
 */

const COVERS = [
  'hospitality-welcome', 'reception-desk', 'concierge-frontdesk', 'vip-butler', 'housekeeping-suite',
  'culinary-fnb', 'chef-mastery', 'afternoon-tea', 'spa-wellness', 'hotel-security', 'valet-fleet',
  'luggage-trolley', 'sop-checklist', 'hafawah-hospitality', 'mobile-learning', 'accreditation-seal',
] as const

export type CoverName = (typeof COVERS)[number]

export interface CourseCoverTarget {
  id: string
  title?: string | null
  category?: string | null
  description?: string | null
  cover_image_url?: string | null
}

/**
 * Curated photo pools per operational department/domain.
 * Sibling courses within a pool rotate based on hash(course.id) so neighbours
 * never repeat the identical photograph side-by-side.
 */
export const CATEGORY_POOLS = {
  // Food & Beverage, Culinary, Dining, Kitchen
  culinary: ['culinary-fnb', 'chef-mastery', 'afternoon-tea'] as const,

  // Front Office, Reception, Check-in, Telephone
  front_office: ['reception-desk', 'concierge-frontdesk', 'hospitality-welcome', 'luggage-trolley'] as const,

  // Concierge, Bell Desk, Luggage, Guest Inquiries
  concierge: ['concierge-frontdesk', 'luggage-trolley', 'hospitality-welcome'] as const,

  // Housekeeping, Room Care, Linen, Laundry, Cleaning
  housekeeping: ['housekeeping-suite', 'sop-checklist', 'hospitality-welcome'] as const,

  // Security, Fire, Life Safety, Crisis, Emergency
  security: ['hotel-security', 'sop-checklist'] as const,

  // Spa, Wellness, Wellbeing, Relaxation
  wellness: ['spa-wellness', 'hospitality-welcome'] as const,

  // Valet Parking, Fleet, Transportation, Drivers
  valet_transport: ['valet-fleet', 'luggage-trolley'] as const,

  // Saudi Hospitality, Hafawah, Karam, Cultural Heritage
  culture_hafawah: ['hafawah-hospitality', 'vip-butler', 'hospitality-welcome'] as const,

  // VIP, Butler Service, Executive Suites, Luxury
  vip_luxury: ['vip-butler', 'hafawah-hospitality', 'accreditation-seal'] as const,

  // Compliance, SOPs, Quality Audits, Standards, Regulatory
  compliance_sop: ['sop-checklist', 'accreditation-seal', 'mobile-learning'] as const,

  // Safe fallback pool for general leadership, HR, IT, and uncategorized topics.
  // Specialized operational photos (valet cars, luggage carts, kitchen cookware)
  // are STRICTLY excluded from the fallback pool.
  general: ['hospitality-welcome', 'accreditation-seal', 'mobile-learning', 'hafawah-hospitality'] as const,
} as const

export type CategoryKey = keyof typeof CATEGORY_POOLS

/**
 * High-precision exact matches: when a title or keyword mentions a specific sub-discipline,
 * we map directly to that exact image rather than pool rotation.
 */
const SPECIFIC_RULES: { cover: CoverName; words: string[] }[] = [
  // Fire and emergency safety -> hotel-security
  {
    cover: 'hotel-security',
    words: [
      'fire', 'emergency', 'evacuat', 'extinguish', 'first aid', 'crisis',
      'حريق', 'طوارئ', 'إخلاء', 'اخلاء', 'إسعافات', 'اسعافات', 'اطفاء', 'أمن وحماية'
    ]
  },
  // Chef, kitchen cook -> chef-mastery
  {
    cover: 'chef-mastery',
    words: ['chef', 'cook', 'baker', 'butchery', 'pastry', 'knife skill', 'شيف', 'طهي', 'طباخ', 'مخبوزات']
  },
  // Tea, coffee, barista, beverage -> afternoon-tea
  {
    cover: 'afternoon-tea',
    words: ['afternoon tea', 'barista', 'coffee', 'tea service', 'beverage', 'شاي', 'قهوة', 'مشروبات', 'باريستا']
  },
  // Valet and driving -> valet-fleet
  {
    cover: 'valet-fleet',
    words: ['valet', 'parking', 'chauffeur', 'limousine', 'صف السيارات', 'مواقف', 'سائق']
  },
  // Luggage and porter -> luggage-trolley
  {
    cover: 'luggage-trolley',
    words: ['luggage', 'bellboy', 'bellhop', 'porter', 'trolley', 'حقائب', 'أمتعة', 'الامتعة', 'حامل الحقائب']
  },
  // Telephone & PBX -> reception-desk
  {
    cover: 'reception-desk',
    words: ['telephone', 'phone call', 'switchboard', 'call handling', 'هاتف', 'الرد على الهاتف', 'مكالمات']
  },
  // Spa & wellness -> spa-wellness
  {
    cover: 'spa-wellness',
    words: ['spa', 'massage', 'wellness', 'wellbeing', 'well-being', 'relaxation', 'سبا', 'مساج', 'استرخاء', 'عافية']
  },
  // VIP & butler -> vip-butler
  {
    cover: 'vip-butler',
    words: ['butler', 'vip', 'presidential', 'royal suite', 'نخبوي', 'بتلر', 'كبار الشخصيات', 'جناح ملكي']
  },
  // Saudi Hafawah & culture -> hafawah-hospitality
  {
    cover: 'hafawah-hospitality',
    words: ['hafawah', 'karam', 'saudi culture', 'saudi heritage', 'dallah', 'حفاوة', 'كرم الضيافة', 'الضيافة السعودية', 'تراث']
  },
]

/**
 * Category/Department broad matches that map to multi-photo pools.
 * Courses in these pools rotate via hash(course.id) to prevent duplicate images.
 */
const CATEGORY_MATCHERS: { pool: readonly CoverName[]; words: string[] }[] = [
  {
    pool: CATEGORY_POOLS.culinary,
    words: [
      'food', 'culinary', 'kitchen', 'restaurant', 'f&b', 'dining', 'menu', 'hygiene', 'haccp',
      'طعام', 'مطبخ', 'مطعم', 'أغذية', 'اغذية', 'سلامة الغذاء', 'بوفيه'
    ]
  },
  {
    pool: CATEGORY_POOLS.security,
    words: [
      'security', 'safety', 'patrol', 'cctv', 'surveillance', 'loss prevention', 'suspici',
      'أمن', 'امن', 'سلامة', 'حراسة', 'اشتباه', 'مراقبة'
    ]
  },
  {
    pool: CATEGORY_POOLS.housekeeping,
    words: [
      'housekeeping', 'room cleaning', 'laundry', 'linen', 'bed making', 'turndown', 'amenities',
      'تدبير', 'تنظيف', 'غرف', 'الغرف', 'بياضات', 'مغسلة'
    ]
  },
  {
    pool: CATEGORY_POOLS.front_office,
    words: [
      'front office', 'front desk', 'reception', 'check-in', 'checkout', 'check out', 'reservation', 'guest arrival',
      'استقبال', 'المكاتب الأمامية', 'تسجيل وصول', 'حجوزات'
    ]
  },
  {
    pool: CATEGORY_POOLS.concierge,
    words: [
      'concierge', 'guest request', 'lost and found', 'wayfinding',
      'كونسيرج', 'إرشاد', 'طلبات النزلاء', 'مفقودات'
    ]
  },
  {
    pool: CATEGORY_POOLS.culture_hafawah,
    words: [
      'culture', 'heritage', 'tradition', 'saudi', 'arabic hospitality',
      'ثقافة', 'تراث', 'تقاليد', 'عادات'
    ]
  },
  {
    pool: CATEGORY_POOLS.compliance_sop,
    words: [
      'compliance', 'sop', 'policy', 'standard', 'procedure', 'audit', 'regulation', 'quality',
      'امتثال', 'معايير', 'إجراءات', 'اجراءات', 'سياسات', 'تدقيق', 'جودة'
    ]
  },
  {
    pool: CATEGORY_POOLS.front_office,
    words: [
      'guest', 'welcome', 'greet', 'complaint', 'service excellence', 'hospitality', 'satisfaction',
      'نزيل', 'نزلاء', 'ضيف', 'ضيوف', 'ترحيب', 'خدمة', 'شكاوى', 'رضا'
    ]
  },
]

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Normalizes explicit category strings to one of our curated pool keys.
 */
function poolForCategory(category?: string | null): readonly CoverName[] | null {
  if (!category) return null
  const c = category.toLowerCase().trim()
  if (c.includes('food') || c.includes('f&b') || c.includes('culinary') || c.includes('dining')) return CATEGORY_POOLS.culinary
  if (c.includes('front') || c.includes('reception')) return CATEGORY_POOLS.front_office
  if (c.includes('concierge')) return CATEGORY_POOLS.concierge
  if (c.includes('housekeep') || c.includes('room') || c.includes('laundry')) return CATEGORY_POOLS.housekeeping
  if (c.includes('secur') || c.includes('safe') || c.includes('guard')) return CATEGORY_POOLS.security
  if (c.includes('spa') || c.includes('wellness')) return CATEGORY_POOLS.wellness
  if (c.includes('valet') || c.includes('transport')) return CATEGORY_POOLS.valet_transport
  if (c.includes('culture') || c.includes('hafawah') || c.includes('heritage')) return CATEGORY_POOLS.culture_hafawah
  if (c.includes('vip') || c.includes('butler') || c.includes('luxury')) return CATEGORY_POOLS.vip_luxury
  if (c.includes('compliance') || c.includes('sop') || c.includes('audit') || c.includes('standard')) return CATEGORY_POOLS.compliance_sop
  return null
}

export function coverFor(course: CourseCoverTarget): CoverName {
  const title = (course.title ?? '').toLowerCase()
  const desc = (course.description ?? '').toLowerCase()
  const combined = `${title} ${desc}`

  // 1. High-precision specific sub-topic matches
  for (const rule of SPECIFIC_RULES) {
    if (rule.words.some((w) => combined.includes(w))) return rule.cover
  }

  // 2. Explicit course category match (rotates within the category pool)
  const categoryPool = poolForCategory(course.category)
  if (categoryPool && categoryPool.length > 0) {
    return categoryPool[hash(course.id) % categoryPool.length]
  }

  // 3. Broad topic/department matching (rotates within the pool to avoid duplicate images)
  for (const matcher of CATEGORY_MATCHERS) {
    if (matcher.words.some((w) => combined.includes(w))) {
      return matcher.pool[hash(course.id) % matcher.pool.length]
    }
  }

  // 4. Safe neutral fallback pool (general hospitality only; never niche photos like valet/chef)
  return CATEGORY_POOLS.general[hash(course.id) % CATEGORY_POOLS.general.length]
}

export function coverUrl(course: CourseCoverTarget): string {
  if (course.cover_image_url && course.cover_image_url.trim().length > 0) {
    return course.cover_image_url
  }
  return `/assets/altus/covers/${coverFor(course)}.webp`
}
