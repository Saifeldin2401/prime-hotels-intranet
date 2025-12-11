export const supportedLanguages = ['en', 'ar'] as const
export type SupportedLanguage = typeof supportedLanguages[number]

export interface Translation {
  [key: string]: string | Translation
}

export interface Translations {
  [language: string]: Translation
}

// English translations
export const enTranslations: Translation = {
  common: {
    welcome: 'Welcome',
    dashboard: 'Dashboard',
    sop: 'SOPs',
    training: 'Training',
    documents: 'Documents',
    announcements: 'Announcements',
    hr: 'HR',
    tasks: 'Tasks',
    messages: 'Messages',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    search: 'Search',
    notifications: 'Notifications',
    save: 'Save',
    cancel: 'Cancel',
    submit: 'Submit',
    edit: 'Edit',
    delete: 'Delete',
    create: 'Create',
    update: 'Update',
    view: 'View',
    share: 'Share',
    like: 'Like',
    comment: 'Comment',
    react: 'React',
    follow: 'Follow',
    bookmark: 'Bookmark'
  },
  roles: {
    staff: 'Staff Member',
    department_head: 'Department Head',
    property_hr: 'Property HR',
    property_manager: 'Property Manager',
    area_manager: 'Area Manager',
    corporate_admin: 'Corporate Admin'
  },
  departments: {
    front_desk: 'Front Desk',
    housekeeping: 'Housekeeping',
    food_beverage: 'Food & Beverage',
    maintenance: 'Maintenance',
    management: 'Management',
    human_resources: 'Human Resources',
    safety: 'Safety'
  },
  sop: {
    title: 'Standard Operating Procedures',
    create_new: 'Create New SOP',
    edit_sop: 'Edit SOP',
    version: 'Version',
    status: 'Status',
    department: 'Department',
    category: 'Category',
    priority: 'Priority',
    last_updated: 'Last Updated',
    created_by: 'Created By',
    approved_by: 'Approved By',
    draft: 'Draft',
    under_review: 'Under Review',
    approved: 'Approved',
    obsolete: 'Obsolete',
    emergency_procedure: 'Emergency Procedure',
    requires_training: 'Requires Training',
    compliance_level: 'Compliance Level'
  },
  training: {
    title: 'Training Hub',
    my_courses: 'My Courses',
    available_courses: 'Available Courses',
    progress: 'Progress',
    completed: 'Completed',
    in_progress: 'In Progress',
    not_started: 'Not Started',
    start_training: 'Start Training',
    continue_training: 'Continue Training',
    certificate: 'Certificate',
    score: 'Score',
    duration: 'Duration',
    modules: 'Modules'
  },
  feed: {
    today: 'Today',
    yesterday: 'Yesterday',
    this_week: 'This Week',
    last_week: 'Last Week',
    this_month: 'This Month',
    post_announcement: 'Post Announcement',
    share_update: 'Share Update',
    add_comment: 'Add a comment...',
    reactions: 'Reactions',
    comments: 'Comments',
    shares: 'Shares',
    tagged: 'Tagged',
    mentioned: 'Mentioned'
  }
}

// Arabic translations (RTL)
export const arTranslations: Translation = {
  common: {
    welcome: 'مرحباً',
    dashboard: 'لوحة القيادة',
    sop: 'إجراءات التشغيل المعيارية',
    training: 'التدريب',
    documents: 'الوثائق',
    announcements: 'الإعلانات',
    hr: 'الموارد البشرية',
    tasks: 'المهام',
    messages: 'الرسائل',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',
    search: 'بحث',
    notifications: 'الإشعارات',
    save: 'حفظ',
    cancel: 'إلغاء',
    submit: 'إرسال',
    edit: 'تعديل',
    delete: 'حذف',
    create: 'إنشاء',
    update: 'تحديث',
    view: 'عرض',
    share: 'مشاركة',
    like: 'إعجاب',
    comment: 'تعليق',
    react: 'تفاعل',
    follow: 'متابعة',
    bookmark: 'حفظ'
  },
  roles: {
    staff: 'موظف',
    department_head: 'رئيس القسم',
    property_hr: 'موارد بشرية الفندق',
    property_manager: 'مدير الفندق',
    area_manager: 'مدير المنطقة',
    corporate_admin: 'مدير الشركة'
  },
  departments: {
    front_desk: 'الاستقبال',
    housekeeping: 'النظافة',
    food_beverage: 'المطاعم والمشروبات',
    maintenance: 'الصيانة',
    management: 'الإدارة',
    human_resources: 'الموارد البشرية',
    safety: 'السلامة'
  },
  sop: {
    title: 'إجراءات التشغيل المعيارية',
    create_new: 'إنشاء إجراء جديد',
    edit_sop: 'تعديل الإجراء',
    version: 'الإصدار',
    status: 'الحالة',
    department: 'القسم',
    category: 'الفئة',
    priority: 'الأولوية',
    last_updated: 'آخر تحديث',
    created_by: 'أنشأه',
    approved_by: 'وافقه',
    draft: 'مسودة',
    under_review: 'قيد المراجعة',
    approved: 'معتمد',
    obsolete: 'ملغي',
    emergency_procedure: 'إجراء طارئ',
    requires_training: 'يتطلب تدريباً',
    compliance_level: 'مستوى الامتثال'
  },
  training: {
    title: 'مركز التدريب',
    my_courses: 'دوراتي',
    available_courses: 'الدورات المتاحة',
    progress: 'التقدم',
    completed: 'مكتمل',
    in_progress: 'قيد التنفيذ',
    not_started: 'لم يبدأ',
    start_training: 'بدء التدريب',
    continue_training: 'متابعة التدريب',
    certificate: 'شهادة',
    score: 'الدرجة',
    duration: 'المدة',
    modules: 'الوحدات'
  },
  feed: {
    today: 'اليوم',
    yesterday: 'أمس',
    this_week: 'هذا الأسبوع',
    last_week: 'الأسبوع الماضي',
    this_month: 'هذا الشهر',
    post_announcement: 'نشر إعلان',
    share_update: 'مشاركة تحديث',
    add_comment: 'أضف تعليقاً...',
    reactions: 'التفاعلات',
    comments: 'التعليقات',
    shares: 'المشاركات',
    tagged: 'موسوم',
    mentioned: 'مذكور'
  }
}

export const translations: Translations = {
  en: enTranslations,
  ar: arTranslations
}

export function getTranslation(language: SupportedLanguage, path: string): string {
  const keys = path.split('.')
  let current: any = translations[language]
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      // Fallback to English if translation not found
      current = enTranslations
      for (const fallbackKey of keys) {
        if (current && typeof current === 'object' && fallbackKey in current) {
          current = current[fallbackKey]
        } else {
          return path // Return the path as fallback
        }
      }
      break
    }
  }
  
  return typeof current === 'string' ? current : path
}

export function isRTL(language: SupportedLanguage): boolean {
  return language === 'ar'
}

export function getDirection(language: SupportedLanguage): 'ltr' | 'rtl' {
  return isRTL(language) ? 'rtl' : 'ltr'
}
