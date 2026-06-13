-- Comprehensive Knowledge Base Injection - Batch 2
-- FAQs, SOPs, and additional content types

-- 5. Sales & Marketing FAQ (FAQ - Bilingual)
INSERT INTO documents (
  id, title, description, content_type, content, summary, summary_ar,
  category_id, department_id, visibility, status, requires_acknowledgment,
  created_by, property_id, is_deleted, faq_items
) VALUES (
  gen_random_uuid(),
  'PHG-FAQ-SAL-001: Corporate Sales & Group Bookings FAQ',
  'Frequently asked questions about corporate rates, group bookings, and contract negotiations.',
  'FAQ',
  '# Corporate Sales & Group Bookings FAQ

**Document ID:** PHG-FAQ-SAL-001  
**Department:** Sales & Marketing

## الأسئلة الشائعة حول المبيعات المؤسسية وحجوزات المجموعات

This FAQ addresses common questions from corporate clients and group organizers.',
  'أسئلة شائعة حول الأسعار المؤسسية وحجوزات المجموعات والتفاوض على العقود.',
  'FAQ about corporate rates, group bookings, and contract negotiations.',
  (SELECT id FROM document_categories WHERE name = 'Standard Operating Procedures' LIMIT 1),
  '00000000-0000-0000-0000-000000000008',
  'all_properties',
  'PUBLISHED',
  false,
  (SELECT id FROM profiles LIMIT 1),
  '739771e0-08ff-4e07-992f-d2be1770aa59',
  false,
  '[
    {
      "id": "sal1",
      "question": "What is the minimum room night requirement for corporate rates?",
      "question_ar": "ما هو الحد الأدنى لعدد ليالي الغرف للحصول على الأسعار المؤسسية؟",
      "answer": "Corporate rates are available for companies committing to a minimum of 100 room nights annually. The rate is tiered based on volume: 100-500 nights (10% discount), 501-1000 nights (15% discount), 1000+ nights (negotiable up to 20% discount).",
      "answer_ar": "الأسعار المؤسسية متاحة للشركات التي تلتزم بحد أدنى 100 ليلة غرفة سنوياً. السعر متدرج حسب الحجم: 100-500 ليلة (خصم 10٪)، 501-1000 ليلة (خصم 15٪)، 1000+ ليلة (قابل للتفاوض حتى 20٪)."
    },
    {
      "id": "sal2",
      "question": "How far in advance should group bookings be made?",
      "question_ar": "كم من الوقت مسبقاً يجب إجراء حجوزات المجموعات؟",
      "answer": "For groups of 10-20 rooms, we recommend booking at least 30 days in advance. For groups of 21-50 rooms, 60 days advance notice is required. For groups exceeding 50 rooms or requiring exclusive use of facilities, please contact us 90+ days in advance.",
      "answer_ar": "للمجموعات من 10-20 غرفة، نوصي بالحجز قبل 30 يوماً على الأقل. للمجموعات من 21-50 غرفة، يلزم إشعار مسبق 60 يوماً. للمجموعات التي تتجاوز 50 غرفة أو تتطلب استخداماً حصرياً للمرافق، يرجى الاتصال بنا قبل 90+ يوماً."
    },
    {
      "id": "sal3",
      "question": "What are the payment terms for corporate accounts?",
      "question_ar": "ما هي شروط الدفع للحسابات المؤسسية؟",
      "answer": "Standard payment terms are Net 30 days from invoice date. Companies with established credit history may qualify for Net 45 or Net 60 terms. All accounts require a signed credit application and two trade references. Direct billing is available for approved accounts only.",
      "answer_ar": "شروط الدفع القياسية هي 30 يوماً صافياً من تاريخ الفاتورة. الشركات ذات التاريخ الائتماني الثابت قد تكون مؤهلة لشروط 45 أو 60 يوماً صافياً. جميع الحسابات تتطلب طلب ائتمان موقع ومرجعين تجاريين. الفوترة المباشرة متاحة فقط للحسابات المعتمدة."
    },
    {
      "id": "sal4",
      "question": "Can we customize meeting packages?",
      "question_ar": "هل يمكننا تخصيص حزم الاجتماعات؟",
      "answer": "Yes! We offer fully customizable meeting packages. Our standard packages include room rental, AV equipment, WiFi, and coffee breaks. You can add lunch/dinner, team building activities, or special setups. Contact our Events team for a tailored proposal.",
      "answer_ar": "نعم! نقدم حزم اجتماعات قابلة للتخصيص بالكامل. تشمل حزمنا القياسية استئجار الغرفة ومعدات AV وWiFi واستراحات القهوة. يمكنك إضافة الغداء/العشاء أو أنشطة بناء الفريق أو إعدادات خاصة. اتصل بفريق الفعاليات للحصول على عرض مخصص."
    },
    {
      "id": "sal5",
      "question": "What is the cancellation policy for group bookings?",
      "question_ar": "ما هي سياسة الإلغاء لحجوزات المجموعات؟",
      "answer": "Cancellation policies vary by group size and season. Generally: 60+ days before arrival = full refund, 30-59 days = 50% penalty, 15-29 days = 75% penalty, less than 15 days = 100% penalty. High season and large groups may have stricter terms. All policies are outlined in the contract.",
      "answer_ar": "تختلف سياسات الإلغاء حسب حجم المجموعة والموسم. بشكل عام: 60+ يوماً قبل الوصول = استرداد كامل، 30-59 يوماً = غرامة 50٪، 15-29 يوماً = غرامة 75٪، أقل من 15 يوماً = غرامة 100٪. الموسم العالي والمجموعات الكبيرة قد يكون لها شروط أكثر صرامة. جميع السياسات موضحة في العقد."
    }
  ]'::jsonb
);

-- 6. Security Access Control SOP (SOP - Bilingual)
INSERT INTO documents (
  id, title, description, content_type, content, summary, summary_ar,
  category_id, department_id, visibility, status, requires_acknowledgment,
  created_by, property_id, is_deleted
) VALUES (
  gen_random_uuid(),
  'PHG-SOP-SEC-001: Access Control & Key Management',
  'Standard operating procedure for managing hotel access control systems and key issuance.',
  'SOP',
  '# Access Control & Key Management

**Document ID:** PHG-SOP-SEC-001  
**Department:** Security

## Purpose

Maintain secure access control to protect guests, staff, and property assets.

## Scope

All security personnel, front desk staff, and department heads.

## Key Types

### Guest Room Keys

**Issuance:**
- Verify guest identity (ID check)
- Confirm reservation in PMS
- Encode 2 keys per room
- Set expiry to checkout date + 1 day

**Deactivation:**
- Automatic upon checkout
- Manual override for early checkout
- Immediate deactivation for lost keys

### Staff Keys

**Master Keys:**
- Issued to: Housekeeping supervisors, Engineering
- Sign-out required
- Return at end of shift
- Audit trail logged

**Department Keys:**
- Department-specific access only
- Manager approval required
- Annual re-certification

**Grand Master:**
- GM and Security Manager only
- Dual custody required
- Usage logged and reviewed

## Access Control System

### Card Reader Zones

**Public Areas:**
- Lobby, restaurants, pool (no restriction)

**Restricted Areas:**
- Back of house (staff cards only)
- Engineering spaces (Engineering only)
- Cash office (Finance + Management)

**High Security:**
- Server room (IT Manager + GM)
- Safe deposit (Dual access)
- CCTV room (Security only)

## Lost Key Procedure

**Guest Reports Lost Key:**

1. Verify guest identity
2. Deactivate lost key immediately
3. Issue replacement keys
4. Log incident in system
5. Charge SAR 100 if not returned

**Staff Reports Lost Key:**

1. Immediate supervisor notification
2. Deactivate key
3. Security incident report
4. Re-key affected areas if master key
5. Disciplinary action per policy

## Emergency Access

**Fire/Medical Emergency:**
- Use emergency override
- Log access time and reason
- Report to Duty Manager

**Police/Authorities:**
- Verify credentials
- Contact GM or Duty Manager
- Escort at all times
- Document access

## Audit Procedures

**Daily:**
- Key inventory count
- Sign-out log review
- System error check

**Weekly:**
- Access log review
- Unusual activity investigation
- Staff key audit

**Monthly:**
- Full system audit
- Key re-encoding
- Access rights review

## KPIs

- Lost key incidents: < 2 per month
- Unauthorized access: Zero tolerance
- Key audit compliance: 100%',
  'Comprehensive access control and key management SOP with procedures for guest keys, staff keys, and emergency access.',
  'إجراءات شاملة للتحكم في الوصول وإدارة المفاتيح مع إجراءات لمفاتيح الضيوف ومفاتيح الموظفين والوصول في حالات الطوارئ.',
  (SELECT id FROM document_categories WHERE name = 'Standard Operating Procedures' LIMIT 1),
  '00000000-0000-0000-0000-000000000007',
  'all_properties',
  'PUBLISHED',
  false,
  (SELECT id FROM profiles LIMIT 1),
  '739771e0-08ff-4e07-992f-d2be1770aa59',
  false
);

-- 7. IT System Backup Guide (How-to Guide - English)
INSERT INTO documents (
  id, title, description, content_type, content, summary, summary_ar,
  category_id, department_id, visibility, status, requires_acknowledgment,
  created_by, property_id, is_deleted
) VALUES (
  gen_random_uuid(),
  'PHG-GUIDE-IT-001: System Backup & Recovery Procedures',
  'Complete guide for performing system backups and disaster recovery procedures.',
  'Guide',
  '# System Backup & Recovery Procedures

**Document ID:** PHG-GUIDE-IT-001  
**Department:** IT

## Backup Strategy

### Daily Backups (Automated)

**PMS Database:**
- Time: 02:00 AM daily
- Retention: 30 days
- Location: Local NAS + Cloud

**Financial Data:**
- Time: 03:00 AM daily
- Retention: 7 years
- Location: Encrypted cloud storage

**Email Server:**
- Time: 04:00 AM daily
- Retention: 90 days
- Location: Office 365 backup

### Weekly Backups

**Full System Image:**
- Time: Sunday 01:00 AM
- Retention: 4 weeks
- Location: Offsite storage

### Monthly Backups

**Archive:**
- First Sunday of month
- Retention: 12 months
- Location: Tape backup (offsite)

## Backup Verification

**Daily Checks:**

1. Review backup logs
2. Verify completion status
3. Check storage capacity
4. Test random file restore

**Monthly Tests:**

1. Full system restore drill
2. Document recovery time
3. Verify data integrity
4. Update recovery procedures

## Recovery Procedures

### File Recovery

**Single File:**

1. Locate backup date
2. Mount backup volume
3. Navigate to file location
4. Copy to original location
5. Verify file integrity

**Multiple Files:**

1. Create recovery list
2. Batch restore operation
3. Verify all files
4. Document recovery

### Database Recovery

**PMS Database:**

1. Stop PMS services
2. Rename current database
3. Restore from backup
4. Verify data consistency
5. Restart services
6. Test critical functions

**Point-in-Time Recovery:**

1. Identify recovery point
2. Restore base backup
3. Apply transaction logs
4. Verify data state
5. Resume operations

### Disaster Recovery

**Complete System Failure:**

1. Activate DR plan
2. Notify management
3. Deploy backup hardware
4. Restore system image
5. Restore databases
6. Verify all services
7. Resume operations
8. Document incident

**RTO/RPO:**
- Recovery Time Objective: 4 hours
- Recovery Point Objective: 24 hours

## Backup Monitoring

**Automated Alerts:**
- Backup failure
- Low storage space
- Verification errors

**Dashboard Metrics:**
- Backup success rate
- Storage utilization
- Recovery time trends

## Emergency Contacts

- IT Manager: Ext. 9001
- System Administrator: Ext. 9002
- Vendor Support: +966-XX-XXX-XXXX',
  'Complete system backup and disaster recovery guide with daily, weekly, and monthly procedures.',
  'دليل كامل للنسخ الاحتياطي للنظام والتعافي من الكوارث مع إجراءات يومية وأسبوعية وشهرية.',
  (SELECT id FROM document_categories WHERE name = 'Standard Operating Procedures' LIMIT 1),
  '00000000-0000-0000-0000-000000000009',
  'department',
  'PUBLISHED',
  false,
  (SELECT id FROM profiles LIMIT 1),
  '739771e0-08ff-4e07-992f-d2be1770aa59',
  false
);;
