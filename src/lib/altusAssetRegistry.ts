/**
 * ALTUS Enterprise Visual Asset Registry
 * Single Source of Truth for all 3D, photographic, and vector assets across ALTUS Learning Ecosystem.
 */

export type AltusAssetFamily =
    | 'people'
    | 'operations'
    | 'learning'
    | 'standards'
    | 'digital'
    | 'conceptual'
    | 'environment'
    | 'icons'

export type AltusAssetCategory =
    | 'front_office'
    | 'guest_room'
    | 'housekeeping'
    | 'fnb'
    | 'engineering'
    | 'security'
    | 'wellness'
    | 'valet'
    | 'gamification'
    | 'certification'
    | 'curriculum'
    | 'compliance'
    | 'leadership'
    | 'mobile'
    | 'culture'

export interface AltusAssetMetadata {
    id: string
    nameEn: string
    nameAr: string
    family: AltusAssetFamily
    category: AltusAssetCategory
    src: string
    tags: string[]
    descriptionEn: string
    descriptionAr: string
    aspectRatio: '16:9' | '1:1' | '3:4' | 'vector'
    materials?: string[]
    suggestedPlacements: Array<
        | 'learner_home'
        | 'course_catalog'
        | 'course_detail'
        | 'training_player'
        | 'my_certificates'
        | 'knowledge_sop'
        | 'admin_hub'
    >
}

export const ALTUS_ASSET_REGISTRY: AltusAssetMetadata[] = [
    // ------------------------------------------------------------------------
    // FAMILY 01 — LEARNERS & PEOPLE
    // ------------------------------------------------------------------------
    {
        id: 'altus_people_learner_male',
        nameEn: 'Saudi Male Hospitality Professional',
        nameAr: 'أخصائي الضيافة السعودي',
        family: 'people',
        category: 'culture',
        src: '/assets/altus/learner-male.jpg',
        tags: ['learner', 'male', 'saudi', 'thawb', 'shemagh', 'tablet', 'onboarding', 'متعلم', 'سعودي', 'ثوب', 'شماغ'],
        descriptionEn: 'Full-body isolated professional in immaculate white thawb and crisp red-and-white shemagh with ALTUS digital training tablet.',
        descriptionAr: 'شخصية قيادية فندقية بالزي السعودي المكتمل يحمل جهازاً لوحياً للتعلم الرقمي مع اعتماد ألتوس.',
        aspectRatio: '1:1',
        materials: ['White Cotton', 'Gold Accent Pin', 'Digital Tablet'],
        suggestedPlacements: ['learner_home', 'admin_hub'],
    },
    {
        id: 'altus_people_learner_female',
        nameEn: 'Saudi Female Corporate Learner',
        nameAr: 'المهنية السعودية للضيافة الفاخرة',
        family: 'people',
        category: 'leadership',
        src: '/assets/altus/learner-female.jpg',
        tags: ['learner', 'female', 'saudi', 'blazer', 'hijab', 'leadership', 'tablet', 'متعلمة', 'سعودية', 'حجاب', 'قيادة'],
        descriptionEn: 'Upper-body corporate learner in a tailored navy executive blazer with ALTUS golden palm insignia lapel pin and modest hijab.',
        descriptionAr: 'مهنية سعودية متميزة ببلايزر كحلي فاخر وبروش ذهبي لأكاديمية ألتوس تعبر عن الكفاءة والتميز القيادي.',
        aspectRatio: '1:1',
        materials: ['Tailored Navy Wool', 'Silk Hijab', 'Gold Insignia'],
        suggestedPlacements: ['learner_home', 'course_detail', 'admin_hub'],
    },

    // ------------------------------------------------------------------------
    // FAMILY 02 — HOSPITALITY OPERATIONS
    // ------------------------------------------------------------------------
    {
        id: 'altus_hospitality_hafawah_majlis',
        nameEn: 'Saudi Hafawah & Majlis Hospitality',
        nameAr: 'حفاوة الضيافة السعودية والمجلس الملكي',
        family: 'operations',
        category: 'culture',
        src: '/assets/altus/hafawah-hospitality.jpg',
        tags: ['hafawah', 'dallah', 'coffee', 'gahwa', 'dates', 'majlis', 'saudi', 'heritage', 'حفاوة', 'قهوة', 'ضيافة', 'تمر', 'مجلس'],
        descriptionEn: 'Traditional solid brass engraved Dallah pouring golden Gahwa into Finjan porcelain cups beside a crystal bowl of dates in a 5-star VIP majlis lounge.',
        descriptionAr: 'دلة القهوة السعودية المذهبة تصب القهوة في الفناجين إلى جوار تمر فاخر في مجلس ملكي لكبار الضيوف.',
        aspectRatio: '16:9',
        materials: ['Engraved Brass', 'Fine Porcelain', 'Cut Crystal'],
        suggestedPlacements: ['course_catalog', 'course_detail', 'learner_home'],
    },
    {
        id: 'altus_hospitality_vip_butler',
        nameEn: 'VIP Butler & Penthouse Silver Service',
        nameAr: 'خدمة المساعد الشخصي الفاخرة والأجنحة الملكية',
        family: 'operations',
        category: 'front_office',
        src: '/assets/altus/vip-butler.jpg',
        tags: ['butler', 'vip', 'silver service', 'suite', 'protocol', 'penthouse', 'خادم شخصي', 'بروتوكول', 'كبار الشخصيات', 'أجنحة'],
        descriptionEn: 'White-gloved executive butler holding a heavy sterling silver tray with crystal water decanter, glassware, and gold VIP keycard pouch in a penthouse suite.',
        descriptionAr: 'مساعد شخصي تنفيذي بقفازات بيضاء يحمل صينية فضية فاخرة تضم إبريق كريستال وبطاقة الجناح الملكي المذهبة.',
        aspectRatio: '16:9',
        materials: ['Sterling Silver', 'Baccarat Crystal', 'Fine Cotton'],
        suggestedPlacements: ['course_catalog', 'course_detail', 'training_player'],
    },
    {
        id: 'altus_hospitality_housekeeping_suite',
        nameEn: 'Presidential Suite Housekeeping Standard',
        nameAr: 'معيار الإشراف الداخلي للجناح الرئاسي',
        family: 'operations',
        category: 'housekeeping',
        src: '/assets/altus/housekeeping-suite.jpg',
        tags: ['housekeeping', 'suite', 'bed', 'linen', 'presidential', 'inspection', 'cleaning', 'غرف', 'نظافة', 'إشراف داخلي', 'جناح'],
        descriptionEn: '5-star presidential suite bed dressed in crisp 1000-thread Egyptian cotton, golden silk runner, fresh orchid, and immaculate housekeeping inspection standard.',
        descriptionAr: 'سرير الجناح الرئاسي مفروش بأفخر الأقمشة القطنية مع وشاح حريري مذهب وزهرة أوركيد وفق معايير فوربس الخمس نجوم.',
        aspectRatio: '16:9',
        materials: ['1000TC Egyptian Cotton', 'Gold Raw Silk', 'Polished Walnut'],
        suggestedPlacements: ['course_catalog', 'course_detail', 'knowledge_sop'],
    },
    {
        id: 'altus_hospitality_spa_wellness',
        nameEn: 'Forbes 5-Star Spa & Wellness Sanctuary',
        nameAr: 'واحة السبا والعافية والاسترخاء الفاخر',
        family: 'operations',
        category: 'wellness',
        src: '/assets/altus/spa-wellness.jpg',
        tags: ['spa', 'wellness', 'massage', 'stones', 'towels', 'relaxation', 'aromatherapy', 'سبا', 'عافية', 'استرخاء', 'تدليك'],
        descriptionEn: 'Smooth basalt hot massage stones, tightly rolled waffle towels, lavender sprigs, ceramic essential oil diffuser with wispy mist, and warm candlelight.',
        descriptionAr: 'أحجار البازلت البركانية للتدليك ومناشف وافل فاخرة مع ناشر زيوت عطرية وشموع هادئة.',
        aspectRatio: '16:9',
        materials: ['Basalt Stone', 'Waffle Cotton', 'Glazed Ceramic'],
        suggestedPlacements: ['course_catalog', 'course_detail'],
    },
    {
        id: 'altus_hospitality_valet_fleet',
        nameEn: 'Grand Porte-Cochère Valet & Limousine Fleet',
        nameAr: 'خدمة صف السيارات وأسطول الليموزين الملكي',
        family: 'operations',
        category: 'valet',
        src: '/assets/altus/valet-fleet.jpg',
        tags: ['valet', 'limousine', 'car', 'fleet', 'arrival', 'porte cochere', 'parking', 'فاليه', 'صف السيارات', 'ليموزين', 'وصول'],
        descriptionEn: 'Gleaming deep-black luxury executive limousine arriving smoothly at an illuminated 5-star hotel porte-cochère under towering palm trees with attentive valet staff.',
        descriptionAr: 'سيارة ليموزين رئاسية سوداء تصل إلى المدخل الفندقي المضاء بالرخام مع طاقم الفاليه ذو الزي الموحد الراقي.',
        aspectRatio: '16:9',
        materials: ['Obsidian Metallic Lacquer', 'Polished Granite', 'Brass Lanterns'],
        suggestedPlacements: ['course_catalog', 'course_detail', 'learner_home'],
    },
    {
        id: 'altus_hospitality_afternoon_tea',
        nameEn: 'Royal Executive Afternoon Tea Service',
        nameAr: 'خدمة شاي بعد الظهيرة الملكي والحلويات الراقية',
        family: 'operations',
        category: 'fnb',
        src: '/assets/altus/afternoon-tea.jpg',
        tags: ['afternoon tea', 'tea', 'pastry', 'patisserie', 'macarons', 'fnb', 'dining', 'شاي', 'حلويات', 'مخبوزات', 'أغذية'],
        descriptionEn: 'Tiered sterling silver pastry stand laden with artisanal saffron macarons, pistachio date tartlets, and fine bone china teacups in a sunlit marble atrium.',
        descriptionAr: 'حامل حلويات فضي مكون من طبقات يضم ماكرون الزعفران وتارت الفستق والتمر مع فناجين شاي الخزف الصيني المطعم بالذهب.',
        aspectRatio: '16:9',
        materials: ['Sterling Silver', 'Fine Bone China', 'Italian Marble'],
        suggestedPlacements: ['course_catalog', 'course_detail'],
    },
    {
        id: 'altus_hospitality_reception_desk',
        nameEn: 'Luxury Reception & Front Office Counter',
        nameAr: 'كاونتر الاستقبال الفندقي الفاخر',
        family: 'operations',
        category: 'front_office',
        src: '/assets/altus/reception-desk.jpg',
        tags: ['reception', 'front desk', 'check in', 'counter', 'marble', 'concierge', 'استقبال', 'كاونتر', 'تسجيل الوصول'],
        descriptionEn: 'Curved Italian Carrara marble front-office podium with rich American walnut fascia and brushed brass gold perimeter trim.',
        descriptionAr: 'منصة استقبال رخامية فاخرة مع تشطيبات من خشب الجوز والنحاس الذهبي المصقول.',
        aspectRatio: '1:1',
        materials: ['Carrara Marble', 'American Walnut', 'Brushed Brass'],
        suggestedPlacements: ['course_catalog', 'course_detail', 'knowledge_sop'],
    },
    {
        id: 'altus_hospitality_luggage_trolley',
        nameEn: '5-Star Bellman Luggage Trolley',
        nameAr: 'عربة حقائب النزلاء الذهبية الفاخرة',
        family: 'operations',
        category: 'front_office',
        src: '/assets/altus/luggage-trolley.jpg',
        tags: ['luggage', 'bellman', 'trolley', 'bags', 'concierge', 'brass', 'حقائب', 'أمتعة', 'عربة', 'كونسيرج'],
        descriptionEn: 'Polished 18k tubular brass birdcage trolley frame carrying luxury hand-stitched leather luggage with gold hardware buckles and room tags.',
        descriptionAr: 'عربة حقائب ذهبية كلاسيكية من النحاس المصقول تحمل حقائب جلدية فاخرة مصنوعة يدوياً.',
        aspectRatio: '1:1',
        materials: ['18k Polished Brass', 'Full-Grain Leather', 'Black Velvet'],
        suggestedPlacements: ['course_catalog', 'course_detail'],
    },
    {
        id: 'altus_hospitality_concierge_frontdesk',
        nameEn: 'Grand Concierge & Welcome Lobby',
        nameAr: 'بهو الاستقبال والكونسيرج الرئيسي',
        family: 'operations',
        category: 'front_office',
        src: '/assets/altus/concierge-frontdesk.jpg',
        tags: ['lobby', 'concierge', 'welcome', 'grand', 'architecture', 'front desk', 'بهو', 'كونسيرج', 'استقبال'],
        descriptionEn: 'Warmly illuminated five-star hotel lobby with high marble columns, crystal chandeliers, and executive concierge station.',
        descriptionAr: 'بهو فندقي مهيب مضاء بإضاءة دافئة مع أعمدة الرخام والثريات الكريستالية ومحطة الكونسيرج التنفيذية.',
        aspectRatio: '16:9',
        materials: ['Crema Marfil Marble', 'Crystal Chandeliers', 'Warm Architectural Accents'],
        suggestedPlacements: ['course_catalog', 'course_detail', 'learner_home'],
    },
    {
        id: 'altus_hospitality_welcome_ceremony',
        nameEn: 'Luxury Guest Welcome Ceremony',
        nameAr: 'مراسم الترحيب والاستقبال الفاخر',
        family: 'operations',
        category: 'front_office',
        src: '/assets/altus/hospitality-welcome.jpg',
        tags: ['welcome', 'guest', 'ceremony', 'arrival', 'etiquette', 'greeting', 'ترحاب', 'ترحيب', 'استقبال', 'إتيكيت'],
        descriptionEn: 'Warm five-star hotel greeting station with refresh scented towels, welcome floral arrangements, and personalized guest folio.',
        descriptionAr: 'محطة استقبال النزلاء الفاخرة مع المناشف المعطرة وترتيبات الزهور الأنيقة.',
        aspectRatio: '16:9',
        materials: ['Polished Wood', 'Fresh White Florals', 'Linen'],
        suggestedPlacements: ['course_catalog', 'course_detail'],
    },
    {
        id: 'altus_hospitality_culinary_fnb',
        nameEn: 'Fine Dining Culinary Presentation',
        nameAr: 'فنون الطهي وتقديم الأطباق الراقية',
        family: 'operations',
        category: 'fnb',
        src: '/assets/altus/culinary-fnb.jpg',
        tags: ['culinary', 'fnb', 'dining', 'food', 'restaurant', 'gourmet', 'طعام', 'أغذية', 'مطعم', 'مأكولات'],
        descriptionEn: 'Gourmet restaurant table with artisanal fine-dining plating, silver cutlery, and crystal glassware on crisp white table linen.',
        descriptionAr: 'طاولة طعام راقية تعكس أرقى معايير تقديم الأطعمة والمشروبات في الفنادق الخمس نجوم.',
        aspectRatio: '16:9',
        materials: ['Limoges Porcelain', 'Sterling Cutlery', 'Crisp White Damask'],
        suggestedPlacements: ['course_catalog', 'course_detail'],
    },

    // ------------------------------------------------------------------------
    // FAMILY 03 — RECOGNITION & GAMIFICATION
    // ------------------------------------------------------------------------
    {
        id: 'altus_recognition_streak_flame',
        nameEn: 'Golden Learning Streak Flame Trophy',
        nameAr: 'كأس شعلة التعلم والتميز المستمر',
        family: 'learning',
        category: 'gamification',
        src: '/assets/altus/streak-flame.jpg',
        tags: ['streak', 'flame', 'trophy', 'gold', 'achievement', 'gamification', 'daily', 'شعلة', 'سلسلة', 'كأس', 'إنجاز'],
        descriptionEn: '3D isolated product render of an 18k champagne gold and amber crystal swirling flame on a heavy black Nero Marquina marble pedestal with gold plaque.',
        descriptionAr: 'منحوتة ثلاثية الأبعاد لشعلة ذهبية من الكريستال والذهب عيار 18 على قاعدة من رخام نيرو ماركينا الأسود مع لوحة منقوشة.',
        aspectRatio: '1:1',
        materials: ['18k Champagne Gold', 'Amber Crystal', 'Nero Marquina Marble'],
        suggestedPlacements: ['my_certificates', 'learner_home'],
    },
    {
        id: 'altus_recognition_master_seal',
        nameEn: 'ALTUS Master Accreditation Seal & Stamp',
        nameAr: 'ختم وشمعة الاعتماد الأكاديمي المذهب',
        family: 'learning',
        category: 'certification',
        src: '/assets/altus/accreditation-seal.jpg',
        tags: ['seal', 'accreditation', 'stamp', 'brass', 'wax', 'certificate', 'emerald', 'اعتماد', 'ختم', 'شهادة', 'معايير'],
        descriptionEn: '3D solid brass seal stamp with turned walnut handle next to an emerald-green and gold foil embossed wax accreditation seal with crisp geometric border.',
        descriptionAr: 'ختم نحاسي مصقول بمقبض من خشب الجوز بجانب ختم شمعي زمردي مطعم برقائق الذهب يعكس الاعتماد الرسمي لألتوس.',
        aspectRatio: '1:1',
        materials: ['Solid Brass', 'Turned Walnut', 'Emerald Wax with Gold Foil'],
        suggestedPlacements: ['my_certificates', 'course_detail', 'training_player'],
    },
    {
        id: 'altus_recognition_cert_badge',
        nameEn: 'Executive Accreditation Medal',
        nameAr: 'ميدالية الاعتماد التنفيذي الفندقي',
        family: 'learning',
        category: 'certification',
        src: '/assets/altus/cert-badge.jpg',
        tags: ['badge', 'medal', 'certificate', 'ribbon', 'laurel', 'star', 'وسام', 'ميدالية', 'شهادة'],
        descriptionEn: 'Heavy polished gold circular medallion with embossed laurel wreath and five-pointed star of excellence suspended from a luxury grosgrain ribbon.',
        descriptionAr: 'ميدالية ذهبية ثقيلة منقوشة بإكليل الغار ونجمة التميز الخماسية مع شريط قماشي فاخر.',
        aspectRatio: '1:1',
        materials: ['Cast Gold Metal', 'Navy Grosgrain Ribbon'],
        suggestedPlacements: ['my_certificates', 'learner_home'],
    },

    // ------------------------------------------------------------------------
    // FAMILY 04 — OPERATIONS, STANDARDS & CULINARY
    // ------------------------------------------------------------------------
    {
        id: 'altus_standards_sop_checklist',
        nameEn: 'Hotel SOP Inspection Clipboard',
        nameAr: 'حافظة تدقيق ومعايير التشغيل القياسية',
        family: 'standards',
        category: 'compliance',
        src: '/assets/altus/sop-checklist.jpg',
        tags: ['sop', 'checklist', 'clipboard', 'audit', 'pen', 'inspection', 'معايير', 'قائمة', 'تدقيق', 'امتثال'],
        descriptionEn: 'Midnight navy leatherette backing with brushed gold heavy spring clip, audit checklist rows, green compliance ticks, and accompanying luxury gold ballpoint pen.',
        descriptionAr: 'حافظة جلدية كحلية مزودة بمشبك ذهبي ثقيل تحتوي على قائمة تدقيق المعايير مع أقلام ذهبية فاخرة.',
        aspectRatio: '1:1',
        materials: ['Navy Leatherette', 'Brushed Gold Clip', 'Fine Archival Paper'],
        suggestedPlacements: ['knowledge_sop', 'course_detail', 'course_catalog'],
    },
    {
        id: 'altus_operations_chef_mastery',
        nameEn: 'Executive Chef Gourmet Plating',
        nameAr: 'إبداع الشيف التنفيذي وفنون الطهي المتقن',
        family: 'standards',
        category: 'fnb',
        src: '/assets/altus/chef-mastery.jpg',
        tags: ['chef', 'plating', 'gourmet', 'kitchen', 'culinary', 'tweezer', 'gold leaf', 'شيف', 'طهي', 'مطبخ', 'مأكولات'],
        descriptionEn: 'Close-up macro culinary photograph of an executive chef using precision tweezers to place edible gold leaf and micro-herbs onto a pan-seared sea bass.',
        descriptionAr: 'لقطة مقربة للشيف التنفيذي وهو يضع بدقة متناهية رقائق الذهب القابلة للأكل والأعشاب الدقيقة فوق طبق السمك الفاخر.',
        aspectRatio: '16:9',
        materials: ['Surgical Stainless Tweezers', 'Edible Gold Leaf', 'Copper Cookware'],
        suggestedPlacements: ['course_catalog', 'course_detail', 'knowledge_sop'],
    },
    {
        id: 'altus_standards_hotel_security',
        nameEn: 'Hotel Security & RFID Smart Access Control',
        nameAr: 'منظومة الأمان والتحكم الذكي بالبطاقات الفندقية',
        family: 'standards',
        category: 'security',
        src: '/assets/altus/hotel-security.jpg',
        tags: ['security', 'access', 'keycard', 'rfid', 'tablet', 'safety', 'cctv', 'أمن', 'حراسة', 'بطاقة', 'سلامة'],
        descriptionEn: 'Dark Italian marble security desk with gold RFID smart room keycard, encrypted access tablet interface, and background security CCTV monitors.',
        descriptionAr: 'مكتب أمني من الرخام الإيطالي الداكن مع بطاقة ذكية مشفرة وجهاز لوحي يوضح حالة غرف النزلاء مع شاشات المراقبة.',
        aspectRatio: '16:9',
        materials: ['Nero Marquina Marble', 'Anodized Titanium', 'Gold Leaf Inlay'],
        suggestedPlacements: ['course_catalog', 'course_detail', 'knowledge_sop'],
    },

    // ------------------------------------------------------------------------
    // FAMILY 05 — DIGITAL & TECHNOLOGY
    // ------------------------------------------------------------------------
    {
        id: 'altus_digital_mobile_lms',
        nameEn: 'ALTUS Mobile Learning Experience',
        nameAr: 'تجربة التعلم الذكي عبر الهاتف المحمول',
        family: 'digital',
        category: 'mobile',
        src: '/assets/altus/mobile-learning.jpg',
        tags: ['mobile', 'phone', 'app', 'lms', 'digital', 'screen', 'progress', 'هاتف', 'تطبيق', 'تعلم رقمي'],
        descriptionEn: 'Floating isometric titanium smartphone running the ALTUS Mobile LMS, displaying active progress ring and lesson syllabus in a luxury hotel setting.',
        descriptionAr: 'هاتف ذكي من التيتانيوم يعرض واجهة تطبيق ألتوس للتعلم المتنقل وسط أجواء فندقية راقية.',
        aspectRatio: '1:1',
        materials: ['Polished Titanium', 'OLED Glass', 'Sapphire Coating'],
        suggestedPlacements: ['learner_home', 'my_certificates'],
    },
]

// ============================================================================
// HELPER LOOKUP FUNCTIONS
// ============================================================================

export function getAltusAssetById(id: string): AltusAssetMetadata | undefined {
    return ALTUS_ASSET_REGISTRY.find((a) => a.id === id)
}

export function getAltusAssetsByFamily(family: AltusAssetFamily): AltusAssetMetadata[] {
    return ALTUS_ASSET_REGISTRY.filter((a) => a.family === family)
}

export function getAltusAssetsByCategory(category: AltusAssetCategory): AltusAssetMetadata[] {
    return ALTUS_ASSET_REGISTRY.filter((a) => a.category === category)
}

export function searchAltusAssets(query: string): AltusAssetMetadata[] {
    const q = query.trim().toLowerCase()
    if (!q) return ALTUS_ASSET_REGISTRY

    return ALTUS_ASSET_REGISTRY.filter((a) => {
        return (
            a.nameEn.toLowerCase().includes(q) ||
            a.nameAr.includes(q) ||
            a.descriptionEn.toLowerCase().includes(q) ||
            a.descriptionAr.includes(q) ||
            a.tags.some((tag) => tag.toLowerCase().includes(q))
        )
    })
}

/**
 * Intelligent track matcher that resolves the most contextually relevant
 * luxury asset for any course, SOP, or training module based on text keywords.
 */
export function resolveAssetForTrack(input: {
    title?: string
    description?: string
    category?: string
    id?: string
}): string {
    const text = `${input.title || ''} ${input.description || ''} ${input.category || ''}`.toLowerCase()

    if (text.includes('حفاوة') || text.includes('قهوة') || text.includes('ضيافة') || text.includes('سعودي') || text.includes('hafawah') || text.includes('dallah') || text.includes('heritage') || text.includes('ثقافة')) {
        return '/assets/altus/hafawah-hospitality.jpg'
    }
    if (text.includes('صف السيارات') || text.includes('فاليه') || text.includes('مواقف') || text.includes('ليموزين') || text.includes('سائق') || text.includes('valet') || text.includes('limousine') || text.includes('fleet') || text.includes('arrival')) {
        return '/assets/altus/valet-fleet.jpg'
    }
    if (text.includes('شاي') || text.includes('حلويات') || text.includes('مخبوزات') || text.includes('afternoon tea') || text.includes('pastry') || text.includes('patisserie') || text.includes('dessert') || text.includes('حلى')) {
        return '/assets/altus/afternoon-tea.jpg'
    }
    if (text.includes('شيف') || text.includes('طهي') || text.includes('مطبخ') || text.includes('chef') || text.includes('culinary master') || text.includes('plating') || text.includes('gourmet')) {
        return '/assets/altus/chef-mastery.jpg'
    }
    if (text.includes('أمن') || text.includes('حراسة') || text.includes('بطاقة') || text.includes('مراقبة') || text.includes('security') || text.includes('keycard') || text.includes('access control') || text.includes('surveillance')) {
        return '/assets/altus/hotel-security.jpg'
    }
    if (text.includes('vip') || text.includes('butler') || text.includes('نخب') || text.includes('بروتوكول') || text.includes('مرافق') || text.includes('شخصيات') || text.includes('executive')) {
        return '/assets/altus/vip-butler.jpg'
    }
    if (text.includes('غرف') || text.includes('نظافة') || text.includes('housekeeping') || text.includes('إشراف') || text.includes('جناح') || text.includes('suite') || text.includes('بياضات')) {
        return '/assets/altus/housekeeping-suite.jpg'
    }
    if (text.includes('سبا') || text.includes('عافية') || text.includes('spa') || text.includes('wellness') || text.includes('تدليك') || text.includes('مساج') || text.includes('استرخاء')) {
        return '/assets/altus/spa-wellness.jpg'
    }
    if (text.includes('استقبال') || text.includes('كاونتر') || text.includes('reception') || text.includes('front desk') || text.includes('check-in') || text.includes('تسجيل الوصول')) {
        return '/assets/altus/reception-desk.jpg'
    }
    if (text.includes('حقائب') || text.includes('أمتعة') || text.includes('luggage') || text.includes('bellman') || text.includes('طلب') || text.includes('مفقودات') || text.includes('concierge')) {
        return '/assets/altus/luggage-trolley.jpg'
    }
    if (text.includes('طعام') || text.includes('أغذية') || text.includes('مشروبات') || text.includes('culinary') || text.includes('f&b') || text.includes('مطعم') || text.includes('dining')) {
        return '/assets/altus/culinary-fnb.jpg'
    }
    if (text.includes('تدقيق') || text.includes('قائمة') || text.includes('sop') || text.includes('checklist') || text.includes('سلامة') || text.includes('امتثال') || text.includes('معايير')) {
        return '/assets/altus/sop-checklist.jpg'
    }
    if (text.includes('شهادة') || text.includes('اعتماد') || text.includes('quiz') || text.includes('assessment') || text.includes('اختبار') || text.includes('تقييم')) {
        return '/assets/altus/cert-badge.jpg'
    }
    if (text.includes('ترحاب') || text.includes('ترحيب') || text.includes('مرحبا') || text.includes('welcome') || text.includes('etiquette') || text.includes('إتيكيت')) {
        return '/assets/altus/hospitality-welcome.jpg'
    }

    // Deterministic fallback rotation across the luxury showcase gallery
    const fallbackList = [
        '/assets/altus/concierge-frontdesk.jpg',
        '/assets/altus/valet-fleet.jpg',
        '/assets/altus/reception-desk.jpg',
        '/assets/altus/hospitality-welcome.jpg',
        '/assets/altus/hafawah-hospitality.jpg',
        '/assets/altus/afternoon-tea.jpg',
        '/assets/altus/vip-butler.jpg',
        '/assets/altus/housekeeping-suite.jpg',
        '/assets/altus/chef-mastery.jpg',
        '/assets/altus/spa-wellness.jpg',
        '/assets/altus/hotel-security.jpg',
        '/assets/altus/luggage-trolley.jpg',
        '/assets/altus/culinary-fnb.jpg',
    ]

    const seed = (input.id || 'altus').charCodeAt(0) || 0
    return fallbackList[Math.abs(seed) % fallbackList.length]
}
