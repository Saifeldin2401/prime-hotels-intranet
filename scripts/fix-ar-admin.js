const fs = require('fs');
const path = require('path');

const arPath = path.join(process.cwd(), 'src', 'i18n', 'locales', 'ar', 'admin.json');
const enPath = path.join(process.cwd(), 'src', 'i18n', 'locales', 'en', 'admin.json');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

ar.ai_governance = en.ai_governance;
ar.report_builder = en.report_builder;
ar.pii_audit.access_history = 'سجل الوصول';
ar.pii_audit.reason_label = 'تصنيف السبب';
ar.pii_audit.no_logs = 'لا توجد سجلات';
ar.pii_audit.loading = 'جاري التحميل';

fs.writeFileSync(arPath, JSON.stringify(ar, null, 4), 'utf8');
console.log('Fixed ar/admin.json');
