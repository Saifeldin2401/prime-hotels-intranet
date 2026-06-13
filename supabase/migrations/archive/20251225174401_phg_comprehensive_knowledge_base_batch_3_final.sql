-- Comprehensive Knowledge Base Injection - Batch 3 (Final)
-- Completing coverage across all departments and content types

-- 8. F&B Restaurant Service SOP (SOP - Arabic Primary)
INSERT INTO documents (
  id, title, description, content_type, content, summary, summary_ar,
  category_id, department_id, visibility, status, requires_acknowledgment,
  created_by, property_id, is_deleted
) VALUES (
  gen_random_uuid(),
  'PHG-SOP-FB-002: Restaurant Service Excellence',
  'Standard operating procedure for restaurant service from guest arrival to departure.',
  'SOP',
  '# Restaurant Service Excellence

**Document ID:** PHG-SOP-FB-002  
**Department:** Food & Beverage

## إجراءات خدمة المطعم المتميزة

### الغرض

تقديم خدمة طعام استثنائية تتجاوز توقعات الضيوف.

## استقبال الضيوف

**عند الوصول:**

1. **الترحيب (خلال 30 ثانية)**
   - "مساء الخير، أهلاً بكم في مطعم برايم"
   - ابتسامة دافئة وتواصل بصري

2. **التحقق من الحجز**
   - "هل لديكم حجز معنا اليوم؟"
   - التحقق في نظام الحجوزات

3. **المرافقة للطاولة**
   - السير أمام الضيوف
   - سحب الكراسي للضيوف
   - تقديم قائمة الطعام

## تقديم الخدمة

### المشروبات (خلال دقيقتين)

1. تقديم قائمة المشروبات
2. اقتراح مشروبات اليوم
3. أخذ الطلب
4. تقديم المشروبات خلال 5 دقائق

### الطعام

**أخذ الطلب:**
- الاستماع بعناية
- تكرار الطلب للتأكيد
- ملاحظة أي حساسية غذائية
- اقتراح أطباق إضافية

**التقديم:**
- الطبق الرئيسي خلال 15-20 دقيقة
- التحقق من رضا الضيوف بعد دقيقتين
- إعادة ملء المشروبات

### الإنهاء

1. عرض الحلويات
2. تقديم الفاتورة
3. معالجة الدفع
4. شكر الضيوف

## معايير الخدمة

✅ **مقبول:**
- ترحيب خلال 30 ثانية
- مشروبات خلال 5 دقائق
- طعام خلال 20 دقيقة
- فحص رضا مرتين

❌ **غير مقبول:**
- تجاهل الضيوف
- أخطاء في الطلبات
- طعام بارد
- خدمة بطيئة',
  'إجراءات خدمة المطعم من الاستقبال حتى المغادرة مع معايير التوقيت والجودة.',
  'Restaurant service procedures from arrival to departure with timing and quality standards.',
  (SELECT id FROM document_categories WHERE name = 'Standard Operating Procedures' LIMIT 1),
  '00000000-0000-0000-0000-000000000003',
  'all_properties',
  'PUBLISHED',
  false,
  (SELECT id FROM profiles LIMIT 1),
  '739771e0-08ff-4e07-992f-d2be1770aa59',
  false
);

-- 9. Front Office Guest Checkout Checklist (Checklist - Bilingual)
INSERT INTO documents (
  id, title, description, content_type, content, summary, summary_ar,
  category_id, department_id, visibility, status, requires_acknowledgment,
  created_by, property_id, is_deleted, checklist_items
) VALUES (
  gen_random_uuid(),
  'PHG-CHECK-FO-002: Guest Checkout Procedure',
  'Complete checklist for processing guest checkouts efficiently and accurately.',
  'Checklist',
  '# Guest Checkout Procedure

**Document ID:** PHG-CHECK-FO-002  
**Department:** Front Office

## قائمة التحقق من مغادرة الضيوف

Use this checklist for every guest checkout to ensure accuracy and guest satisfaction.',
  'قائمة تحقق شاملة لمعالجة مغادرة الضيوف بكفاءة ودقة.',
  'Complete checkout checklist for efficient and accurate guest departures.',
  (SELECT id FROM document_categories WHERE name = 'Standard Operating Procedures' LIMIT 1),
  '00000000-0000-0000-0000-000000000001',
  'all_properties',
  'PUBLISHED',
  false,
  (SELECT id FROM profiles LIMIT 1),
  '739771e0-08ff-4e07-992f-d2be1770aa59',
  false,
  '[
    {"id": "co1", "text": "Greet guest and verify room number", "is_required": true},
    {"id": "co2", "text": "Review folio for accuracy", "is_required": true},
    {"id": "co3", "text": "Check for mini-bar charges", "is_required": true},
    {"id": "co4", "text": "Verify phone call charges", "is_required": true},
    {"id": "co5", "text": "Ask about guest satisfaction", "is_required": false},
    {"id": "co6", "text": "Process payment or charge to account", "is_required": true},
    {"id": "co7", "text": "Collect room keys", "is_required": true},
    {"id": "co8", "text": "Provide itemized receipt", "is_required": true},
    {"id": "co9", "text": "Offer luggage assistance", "is_required": false},
    {"id": "co10", "text": "Thank guest and invite return visit", "is_required": true},
    {"id": "co11", "text": "Update room status to Dirty in PMS", "is_required": true},
    {"id": "co12", "text": "Notify Housekeeping of checkout", "is_required": true}
  ]'::jsonb
);

-- 10. Housekeeping Linen Management Policy (Policy - Arabic)
INSERT INTO documents (
  id, title, description, content_type, content, summary, summary_ar,
  category_id, department_id, visibility, status, requires_acknowledgment,
  created_by, property_id, is_deleted
) VALUES (
  gen_random_uuid(),
  'PHG-POL-HK-001: Linen & Laundry Management Policy',
  'Comprehensive policy for linen inventory, laundering standards, and quality control.',
  'Policy',
  '# Linen & Laundry Management Policy

**Document ID:** PHG-POL-HK-001  
**Department:** Housekeeping

## سياسة إدارة الكتان والغسيل

### الغرض

ضمان توفر كميات كافية من الكتان النظيف وفقاً لأعلى معايير النظافة.

## مستويات المخزون

### الحد الأدنى للمخزون

**أغطية السرير:**
- ملاءات: 3 مجموعات لكل غرفة
- أغطية لحاف: 3 لكل غرفة
- وسائد: 4 لكل غرفة

**مناشف الحمام:**
- مناشف استحمام: 4 لكل غرفة
- مناشف يد: 4 لكل غرفة
- مناشف وجه: 4 لكل غرفة
- سجادة حمام: 2 لكل غرفة

## معايير الغسيل

### درجات الحرارة

**الغسيل:**
- ملاءات بيضاء: 75°C
- ملاءات ملونة: 60°C
- مناشف: 75°C

**التجفيف:**
- درجة حرارة متوسطة
- التحقق من الجفاف الكامل

### المنظفات

**الكميات:**
- منظف: حسب تعليمات الشركة المصنعة
- مبيض (للبياضات فقط): 50 مل لكل 10 كجم
- منعم: 30 مل لكل 10 كجم

## فحص الجودة

### معايير القبول

✅ **مقبول:**
- نظيف تماماً
- لا بقع
- رائحة منعشة
- مكوي جيداً

❌ **مرفوض:**
- بقع متبقية
- تمزقات
- روائح كريهة
- ألوان باهتة

## الاستبدال

**معايير الاستبدال:**
- تمزق أو ثقوب
- بقع دائمة
- بهتان شديد
- بعد 300 غسلة

## التتبع

**يومي:**
- عد الكتان النظيف
- عد الكتان المتسخ
- تسجيل الكميات المغسولة

**شهري:**
- جرد كامل
- حساب معدل الاستبدال
- طلب مخزون جديد',
  'سياسة شاملة لإدارة مخزون الكتان ومعايير الغسيل ومراقبة الجودة.',
  'Comprehensive linen inventory, laundering standards, and quality control policy.',
  (SELECT id FROM document_categories WHERE name = 'Corporate Policies' LIMIT 1),
  '00000000-0000-0000-0000-000000000002',
  'all_properties',
  'PUBLISHED',
  true,
  (SELECT id FROM profiles LIMIT 1),
  '739771e0-08ff-4e07-992f-d2be1770aa59',
  false
);;
