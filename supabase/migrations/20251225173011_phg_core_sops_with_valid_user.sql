-- Create 3 Critical Enterprise SOPs with valid user

-- 1. Code of Conduct
INSERT INTO documents (
  id, title, description, content_type, content, summary, summary_ar,
  category_id, department_id, visibility, status, requires_acknowledgment,
  created_by, property_id, is_deleted
) VALUES (
  gen_random_uuid(),
  'PHG-POL-CORP-001: Code of Conduct & Business Ethics',
  'Corporate code of conduct establishing ethical standards and professional behavior for all PHG employees.',
  'Policy',
  '# Code of Conduct & Business Ethics

**Document ID:** PHG-POL-CORP-001

## Core Values

### Integrity
- Honest and transparent business conduct
- Accurate record-keeping
- Zero tolerance for fraud

### Respect
- Professional courtesy to all
- Cultural sensitivity in KSA
- Zero discrimination

### Excellence
- Highest hospitality standards
- Continuous improvement

### Accountability
- Personal responsibility
- Timely issue reporting

### Compliance
- Saudi Labor Law adherence
- Municipality regulations

## Professional Conduct

**Expected:**
- Punctuality and reliability
- Professional appearance
- Respectful communication

**Prohibited:**
- Harassment or bullying
- Substance abuse on property
- Theft or property misuse

## Guest Interactions

1. Warm greetings (Arabic/English)
2. Professional boundaries
3. Guest privacy protection
4. Immediate complaint reporting

> **KSA Cultural Note:** Maintain appropriate gender interaction protocols.

## Conflicts of Interest

**Report immediately:**
- Financial interest in suppliers/competitors
- Supervising family members
- Gifts exceeding SAR 500

## Confidentiality

**Protect:**
- Guest personal data
- Financial records
- Proprietary systems

## Reporting Violations

**Channels:**
1. Direct Supervisor
2. Human Resources
3. General Manager
4. Corporate Compliance Hotline

**Non-Retaliation Policy:** PHG prohibits retaliation against good-faith reporters.',
  'Corporate code of conduct with ethical standards, professional behavior expectations, and reporting procedures.',
  'مدونة السلوك المؤسسي مع المعايير الأخلاقية وتوقعات السلوك المهني وإجراءات الإبلاغ.',
  (SELECT id FROM document_categories WHERE name = 'Corporate Policies' LIMIT 1),
  '00000000-0000-0000-0000-000000000010',
  'all_properties',
  'PUBLISHED',
  true,
  (SELECT id FROM profiles LIMIT 1),
  '739771e0-08ff-4e07-992f-d2be1770aa59',
  false
);

-- 2. Guest Check-In Procedures
INSERT INTO documents (
  id, title, description, content_type, content, summary, summary_ar,
  category_id, department_id, visibility, status, requires_acknowledgment,
  created_by, property_id, is_deleted
) VALUES (
  gen_random_uuid(),
  'PHG-SOP-FO-001: Guest Check-In Procedures',
  'Standard operating procedure for professional guest check-in at Prime Hotels Group properties.',
  'SOP',
  '# Guest Check-In Procedures

**Document ID:** PHG-SOP-FO-001  
**Department:** Front Office

## Purpose

Ensure consistent, professional guest check-in across all PHG properties.

## Check-In Procedure

### Step 1: Guest Greeting

**English:** "Good morning/afternoon/evening. Welcome to Prime Hotels. How may I assist you today?"

**Arabic:** "صباح الخير / مساء الخير. أهلاً بكم في فنادق برايم. كيف يمكنني مساعدتكم؟"

### Step 2: Identification

1. Request government-issued ID
2. Locate reservation in PMS
3. Verify guest details

### Step 3: Registration

1. Complete registration card
2. Obtain signature
3. Scan ID document

### Step 4: Payment

**Individual Guests:**
- Request credit card
- Process pre-authorization

**Corporate:**
- Verify billing instructions
- Apply corporate rate

### Step 5: Room Assignment

1. Assign room
2. Encode key cards (2 keys)
3. Verify functionality

### Step 6: Information

Provide:
- WiFi password
- Breakfast times
- Pool/gym hours
- Check-out time (12:00 PM)

## VIP Protocol

1. Notify Duty Manager
2. Escort to room
3. In-room registration
4. Follow-up call within 30 min

## KPIs

- Check-in time: 3-5 minutes
- Satisfaction: ≥ 4.5/5.0',
  'Guest check-in SOP with greeting protocols, registration steps, and VIP handling.',
  'إجراءات تسجيل وصول الضيوف مع بروتوكولات الترحيب وخطوات التسجيل.',
  (SELECT id FROM document_categories WHERE name = 'Standard Operating Procedures' LIMIT 1),
  '00000000-0000-0000-0000-000000000001',
  'all_properties',
  'PUBLISHED',
  false,
  (SELECT id FROM profiles LIMIT 1),
  '739771e0-08ff-4e07-992f-d2be1770aa59',
  false
);

-- 3. Public Area Cleaning
INSERT INTO documents (
  id, title, description, content_type, content, summary, summary_ar,
  category_id, department_id, visibility, status, requires_acknowledgment,
  created_by, property_id, is_deleted
) VALUES (
  gen_random_uuid(),
  'PHG-SOP-HK-002: Public Area Cleaning Standards',
  'Comprehensive cleaning standards for hotel public areas.',
  'SOP',
  '# Public Area Cleaning Standards

**Document ID:** PHG-SOP-HK-002  
**Department:** Housekeeping

## الغرض

ضمان نظافة المناطق العامة بأعلى معايير الضيافة.

## جدول التنظيف

### التنظيف المستمر

**كل ساعة:**
- فحص اللوبي
- تنظيف الأسطح
- إفراغ سلات المهملات

**كل ساعتين:**
- تنظيف دورات المياه
- إعادة ملء المستلزمات

## إجراءات اللوبي

**الصباح (06:00 - 08:00):**

1. **الأرضيات**
   - كنس شامل
   - مسح رطب
   - تلميع الرخام

2. **الأثاث**
   - مسح الطاولات
   - ترتيب الوسائد

3. **الديكور**
   - مسح النباتات
   - تلميع المرايا

## دورات المياه

**كل ساعتين:**

1. **الأحواض**
   - تنظيف بمطهر
   - تلميع الصنابير

2. **المراحيض**
   - تنظيف شامل
   - تطهير كامل

3. **المستلزمات**
   - إعادة ملء الصابون
   - تجديد المناشف

## السلامة

> **تحذير:** استخدم معدات الحماية (PPE)

- لا تخلط المواد الكيميائية
- اتبع تعليمات الشركة المصنعة

## معايير الجودة

✅ **مقبول:**
- أسطح نظيفة
- لا روائح كريهة

❌ **غير مقبول:**
- بقع مرئية
- سلات ممتلئة',
  'معايير تنظيف المناطق العامة مع جداول ومتطلبات السلامة.',
  'Public area cleaning standards with schedules and safety requirements.',
  (SELECT id FROM document_categories WHERE name = 'Standard Operating Procedures' LIMIT 1),
  '00000000-0000-0000-0000-000000000002',
  'all_properties',
  'PUBLISHED',
  false,
  (SELECT id FROM profiles LIMIT 1),
  '739771e0-08ff-4e07-992f-d2be1770aa59',
  false
);;
