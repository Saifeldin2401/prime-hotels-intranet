const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const missingReport = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tmp', 'missing-translation-keys.json'), 'utf8'));

// Translations for missing keys
const translations = {
    common: {
        loading: { en: 'Loading...', ar: 'جاري التحميل...' },
        cancel: { en: 'Cancel', ar: 'إلغاء' },
        priority: { en: 'Priority', ar: 'الأولوية' },
        no_description_provided: { en: 'No description provided', ar: 'لم يتم تقديم وصف' },
        department: { en: 'Department', ar: 'القسم' },
        select_department: { en: 'Select department', ar: 'اختر القسم' },
        select_type: { en: 'Select type', ar: 'اختر النوع' },
        error: { en: 'Error', ar: 'خطأ' },
        profile: { en: 'Profile', ar: 'الملف الشخصي' },
        status_label: { en: 'Status', ar: 'الحالة' },
        notifications_label: { en: 'Notifications', ar: 'الإشعارات' },
        no_results: { en: 'No results', ar: 'لا توجد نتائج' },
        try_different_search: { en: 'Try a different search', ar: 'جرب بحثاً مختلفاً' },
        of: { en: 'of', ar: 'من' },
        refresh: { en: 'Refresh', ar: 'تحديث' },
        search_users: { en: 'Search users', ar: 'البحث عن مستخدمين' },
        my_team: { en: 'My Team', ar: 'فريقي' },
        active: { en: 'Active', ar: 'نشط' },
        search: { en: 'Search', ar: 'بحث' },
        not_specified: { en: 'Not specified', ar: 'غير محدد' },
        inactive: { en: 'Inactive', ar: 'غير نشط' },
        error_occurred: { en: 'An error occurred', ar: 'حدث خطأ' },
        save: { en: 'Save', ar: 'حفظ' },
        phone: { en: 'Phone', ar: 'الهاتف' },
        user: { en: 'User', ar: 'المستخدم' },
        go_back: { en: 'Go Back', ar: 'رجوع' },
        saving: { en: 'Saving...', ar: 'جاري الحفظ...' },
        yes: { en: 'Yes', ar: 'نعم' },
        no: { en: 'No', ar: 'لا' },
        'actions.close': { en: 'Close', ar: 'إغلاق' },
        'actions.delete_success': { en: 'Deleted successfully', ar: 'تم الحذف بنجاح' },
        'errors.delete_failed': { en: 'Failed to delete', ar: 'فشل الحذف' },
        'labels.typing_search': { en: 'Start typing to search...', ar: 'ابدأ الكتابة للبحث...' },
        'actions.retry': { en: 'Retry', ar: 'إعادة المحاولة' },
        'messages.success_action': { en: 'Action completed successfully', ar: 'تمت العملية بنجاح' },
        'labels.property': { en: 'Property', ar: 'العقار' },
        'actions.copy_success': { en: 'Copied successfully', ar: 'تم النسخ بنجاح' },
        'actions.link_copied_desc': { en: 'Link copied to clipboard', ar: 'تم نسخ الرابط إلى الحافظة' },
        'actions.processing': { en: 'Processing...', ar: 'جاري المعالجة...' },
        'common.inactive': { en: 'Inactive', ar: 'غير نشط' },
        'common.no_data': { en: 'No data', ar: 'لا توجد بيانات' }
    },
    admin: {
        'properties.success.deleted': { en: 'Property deleted successfully', ar: 'تم حذف العقار بنجاح' },
        'properties.confirm_delete_title': { en: 'Delete Property', ar: 'حذف العقار' },
        'properties.property': { en: 'Property', ar: 'العقار' },
        'properties.confirm_delete_desc': { en: 'Are you sure you want to delete this property? This action cannot be undone.', ar: 'هل أنت متأكد من حذف هذا العقار؟ لا يمكن التراجع عن هذا الإجراء.' }
    },
    training: {
        'quizzes.player.limit_reached_title': { en: 'Attempt Limit Reached', ar: 'تم الوصول إلى الحد الأقصى للمحاولات' },
        'quizzes.player.limit_reached_desc': { en: 'You have reached the maximum number of attempts for this quiz.', ar: 'لقد وصلت إلى الحد الأقصى لعدد المحاولات لهذا الاختبار.' },
        'quizzes.player.source': { en: 'Source', ar: 'المصدر' },
        'quizzes.player.time_up': { en: "Time's Up!", ar: 'انتهى الوقت!' },
        'quizzes.player.auto_submitting': { en: 'Auto-submitting your answers...', ar: 'جاري تسليم إجاباتك تلقائياً...' }
    },
    operations: {
        'flash.title': { en: 'Flash Report', ar: 'تقرير فلاش' },
        'data_import.errors.xls_not_supported': { en: 'XLS files are not supported. Please convert to XLSX.', ar: 'ملفات XLS غير مدعومة. يرجى التحويل إلى XLSX.' },
        'analytics.title': { en: 'Analytics', ar: 'التحليلات' },
        'analytics.subtitle': { en: 'Performance analytics and insights', ar: 'تحليلات الأداء والرؤى' },
        'analytics.trends': { en: 'Trends', ar: 'الاتجاهات' },
        'analytics.comparison': { en: 'Comparison', ar: 'المقارنة' },
        'analytics.segments': { en: 'Segments', ar: 'الشرائح' },
        'nav.analytics': { en: 'Analytics', ar: 'التحليلات' },
        'nav.flash_report': { en: 'Flash Report', ar: 'تقرير فلاش' },
        'nav.import': { en: 'Import Data', ar: 'استيراد البيانات' },
        'nav.pms_config': { en: 'PMS Config', ar: 'إعدادات نظام إدارة الممتلكات' },
        'config.title': { en: 'Configuration', ar: 'الإعدادات' },
        'config.subtitle': { en: 'System configuration settings', ar: 'إعدادات تهيئة النظام' }
    },
    profile: {
        invalid_user_id: { en: 'Invalid user ID', ar: 'معرف مستخدم غير صالح' },
        overview: { en: 'Overview', ar: 'نظرة عامة' },
        staff_id: { en: 'Staff ID', ar: 'رقم الموظف' },
        bio: { en: 'Bio', ar: 'نبذة' },
        team_members: { en: 'Team Members', ar: 'أعضاء الفريق' },
        private_info: { en: 'Private Information', ar: 'معلومات خاصة' },
        date_of_birth: { en: 'Date of Birth', ar: 'تاريخ الميلاد' },
        national_id: { en: 'National ID', ar: 'الهوية الوطنية' },
        salary_grade: { en: 'Salary Grade', ar: 'الدرجة الوظيفية' },
        certifications: { en: 'Certifications', ar: 'الشهادات' },
        no_certifications: { en: 'No certifications yet', ar: 'لا توجد شهادات بعد' }
    },
    public: {
        'verification.invalid_title': { en: 'Invalid Certificate', ar: 'شهادة غير صالحة' },
        'verification.recipient': { en: 'Recipient', ar: 'المستلم' },
        'verification.course': { en: 'Course', ar: 'الدورة' },
        'verification.issued_on': { en: 'Issued On', ar: 'تاريخ الإصدار' },
        'verification.id': { en: 'Certificate ID', ar: 'رقم الشهادة' }
    }
};

function setNestedValue(obj, keyPath, value) {
    const keys = keyPath.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
}

function addMissingKeys(namespace, keys, lang) {
    const filePath = path.join(localesDir, lang, `${namespace}.json`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️ File not found: ${filePath}`);
        return 0;
    }
    
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
    let added = 0;
    
    for (const keyInfo of keys) {
        const keyPath = keyInfo.key.split(':')[1];
        const translation = translations[namespace]?.[keyPath];
        
        if (translation) {
            setNestedValue(content, keyPath, translation[lang]);
            added++;
        } else {
            console.log(`  ⚠️ No translation for: ${keyPath}`);
        }
    }
    
    fs.writeFileSync(filePath, JSON.stringify(content, null, 4) + '\n', 'utf8');
    return added;
}

console.log('Fixing missing translations...\n');

let totalAdded = 0;

for (const [namespace, keys] of Object.entries(missingReport)) {
    if (keys.length === 0) continue;
    
    console.log(`${namespace}.json: ${keys.length} keys to add`);
    
    const enAdded = addMissingKeys(namespace, keys, 'en');
    const arAdded = addMissingKeys(namespace, keys, 'ar');
    
    console.log(`  ✓ Added ${enAdded} EN, ${arAdded} AR`);
    totalAdded += enAdded + arAdded;
}

console.log('\n' + '='.repeat(50));
console.log(`Total translations added: ${totalAdded}`);
console.log('='.repeat(50));
