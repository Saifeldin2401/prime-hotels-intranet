/**
 * Automated Translation Script
 * Extracts hardcoded strings from components and adds them to translation files
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

// Common hardcoded strings that should be translated
const commonStrings = {
    // Placeholders
    'placeholder.select': 'Select...',
    'placeholder.search': 'Search...',
    'placeholder.enter_title': 'Enter title',
    'placeholder.enter_description': 'Enter description (optional)',
    'placeholder.select_property': 'Select property',
    'placeholder.select_department': 'Select department',
    'placeholder.select_employee': 'Select employee',
    'placeholder.select_user': 'Select a user',
    'placeholder.reason': 'Enter reason...',
    'placeholder.notes': 'Add notes...',
    'placeholder.comment': 'Add a comment...',
    
    // Button labels
    'button.save': 'Save',
    'button.cancel': 'Cancel',
    'button.delete': 'Delete',
    'button.edit': 'Edit',
    'button.create': 'Create',
    'button.submit': 'Submit',
    'button.close': 'Close',
    'button.back': 'Back',
    'button.next': 'Next',
    'button.confirm': 'Confirm',
    'button.approve': 'Approve',
    'button.reject': 'Reject',
    'button.download': 'Download',
    'button.upload': 'Upload',
    'button.refresh': 'Refresh',
    'button.filter': 'Filter',
    'button.clear': 'Clear',
    'button.view': 'View',
    'button.add': 'Add',
    'button.remove': 'Remove',
    
    // Table headers
    'table.name': 'Name',
    'table.status': 'Status',
    'table.actions': 'Actions',
    'table.date': 'Date',
    'table.type': 'Type',
    'table.description': 'Description',
    'table.title': 'Title',
    'table.email': 'Email',
    'table.department': 'Department',
    'table.role': 'Role',
    'table.created': 'Created',
    'table.updated': 'Updated',
    
    // Messages
    'message.loading': 'Loading...',
    'message.no_data': 'No data available',
    'message.no_results': 'No results found',
    'message.error': 'An error occurred',
    'message.success': 'Operation successful',
    'message.confirm_delete': 'Are you sure you want to delete this item?',
    'message.required': 'This field is required',
    
    // Status labels
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.pending': 'Pending',
    'status.approved': 'Approved',
    'status.rejected': 'Rejected',
    'status.completed': 'Completed',
    'status.draft': 'Draft',
    
    // Form labels
    'form.title': 'Title',
    'form.description': 'Description',
    'form.status': 'Status',
    'form.type': 'Type',
    'form.category': 'Category',
    'form.priority': 'Priority',
    'form.due_date': 'Due Date',
    'form.assigned_to': 'Assigned To',
    'form.notes': 'Notes',
    'form.reason': 'Reason',
    
    // Navigation
    'nav.home': 'Home',
    'nav.back_to_list': 'Back to List',
    'nav.view_details': 'View Details',
    
    // Misc
    'misc.optional': '(Optional)',
    'misc.required': '*',
    'misc.show_more': 'Show more',
    'misc.show_less': 'Show less',
    'misc.read_more': 'Read more',
    'misc.view_all': 'View All',
    'misc.see_all': 'See All',
};

// Arabic translations
const arabicTranslations = {
    'placeholder.select': 'اختر...',
    'placeholder.search': 'بحث...',
    'placeholder.enter_title': 'أدخل العنوان',
    'placeholder.enter_description': 'أدخل الوصف (اختياري)',
    'placeholder.select_property': 'اختر العقار',
    'placeholder.select_department': 'اختر القسم',
    'placeholder.select_employee': 'اختر الموظف',
    'placeholder.select_user': 'اختر مستخدم',
    'placeholder.reason': 'أدخل السبب...',
    'placeholder.notes': 'أضف ملاحظات...',
    'placeholder.comment': 'أضف تعليقاً...',
    
    'button.save': 'حفظ',
    'button.cancel': 'إلغاء',
    'button.delete': 'حذف',
    'button.edit': 'تعديل',
    'button.create': 'إنشاء',
    'button.submit': 'إرسال',
    'button.close': 'إغلاق',
    'button.back': 'رجوع',
    'button.next': 'التالي',
    'button.confirm': 'تأكيد',
    'button.approve': 'موافقة',
    'button.reject': 'رفض',
    'button.download': 'تحميل',
    'button.upload': 'رفع',
    'button.refresh': 'تحديث',
    'button.filter': 'تصفية',
    'button.clear': 'مسح',
    'button.view': 'عرض',
    'button.add': 'إضافة',
    'button.remove': 'إزالة',
    
    'table.name': 'الاسم',
    'table.status': 'الحالة',
    'table.actions': 'الإجراءات',
    'table.date': 'التاريخ',
    'table.type': 'النوع',
    'table.description': 'الوصف',
    'table.title': 'العنوان',
    'table.email': 'البريد الإلكتروني',
    'table.department': 'القسم',
    'table.role': 'الدور',
    'table.created': 'تاريخ الإنشاء',
    'table.updated': 'تاريخ التحديث',
    
    'message.loading': 'جاري التحميل...',
    'message.no_data': 'لا توجد بيانات متاحة',
    'message.no_results': 'لم يتم العثور على نتائج',
    'message.error': 'حدث خطأ',
    'message.success': 'تمت العملية بنجاح',
    'message.confirm_delete': 'هل أنت متأكد من حذف هذا العنصر؟',
    'message.required': 'هذا الحقل مطلوب',
    
    'status.active': 'نشط',
    'status.inactive': 'غير نشط',
    'status.pending': 'معلق',
    'status.approved': 'تمت الموافقة',
    'status.rejected': 'مرفوض',
    'status.completed': 'مكتمل',
    'status.draft': 'مسودة',
    
    'form.title': 'العنوان',
    'form.description': 'الوصف',
    'form.status': 'الحالة',
    'form.type': 'النوع',
    'form.category': 'الفئة',
    'form.priority': 'الأولوية',
    'form.due_date': 'تاريخ الاستحقاق',
    'form.assigned_to': 'مخصص لـ',
    'form.notes': 'ملاحظات',
    'form.reason': 'السبب',
    
    'nav.home': 'الرئيسية',
    'nav.back_to_list': 'العودة للقائمة',
    'nav.view_details': 'عرض التفاصيل',
    
    'misc.optional': '(اختياري)',
    'misc.required': '*',
    'misc.show_more': 'عرض المزيد',
    'misc.show_less': 'عرض أقل',
    'misc.read_more': 'قراءة المزيد',
    'misc.view_all': 'عرض الكل',
    'misc.see_all': 'مشاهدة الكل',
};

function updateTranslationFile(filePath, newKeys, translations) {
    let content = {};
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
        content = JSON.parse(data);
    }
    
    let added = 0;
    for (const [key, value] of Object.entries(newKeys)) {
        const keys = key.split('.');
        let current = content;
        
        // Build nested structure
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        // Set value if not exists
        const lastKey = keys[keys.length - 1];
        if (!current[lastKey]) {
            current[lastKey] = translations[key] || value;
            added++;
        }
    }
    
    // Write back with proper formatting
    fs.writeFileSync(filePath, JSON.stringify(content, null, 4) + '\n', 'utf8');
    return added;
}

// Update common.json files
const enCommonPath = path.join(localesDir, 'en', 'common.json');
const arCommonPath = path.join(localesDir, 'ar', 'common.json');

console.log('Adding missing translations to common.json...\n');

const enAdded = updateTranslationFile(enCommonPath, commonStrings, commonStrings);
console.log(`✓ English: Added ${enAdded} new keys`);

const arAdded = updateTranslationFile(arCommonPath, commonStrings, arabicTranslations);
console.log(`✓ Arabic: Added ${arAdded} new keys`);

console.log('\n' + '='.repeat(50));
console.log('Translation files updated successfully!');
console.log('='.repeat(50));
