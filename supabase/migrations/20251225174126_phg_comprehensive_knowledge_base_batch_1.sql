-- Comprehensive Knowledge Base Injection - Batch 1
-- Creating diverse content types across departments

-- 1. F&B HACCP Policy (Policy - Bilingual)
INSERT INTO documents (
  id, title, description, content_type, content, summary, summary_ar,
  category_id, department_id, visibility, status, requires_acknowledgment,
  created_by, property_id, is_deleted
) VALUES (
  gen_random_uuid(),
  'PHG-POL-FB-001: HACCP Food Safety Policy',
  'Comprehensive HACCP food safety policy for all F&B operations in compliance with KSA municipality requirements.',
  'Policy',
  '# HACCP Food Safety Policy

**Document ID:** PHG-POL-FB-001  
**Department:** Food & Beverage  
**Language:** Bilingual

## سياسة سلامة الغذاء HACCP

### الغرض

ضمان أعلى معايير سلامة الغذاء في جميع عمليات الأغذية والمشروبات.

## Policy Statement

Prime Hotels Group is committed to maintaining the highest standards of food safety through systematic HACCP (Hazard Analysis Critical Control Points) implementation.

## Scope

Applies to: All F&B staff, kitchen personnel, service staff, and management.

## Critical Control Points

### 1. Receiving

**Temperature Control:**
- Frozen foods: -18°C or below
- Chilled foods: 0-5°C
- Hot foods: Above 60°C

**Rejection Criteria:**
- Damaged packaging
- Expired products
- Incorrect temperatures
- Signs of contamination

### 2. Storage

**Dry Storage:**
- Temperature: 15-21°C
- Humidity: Below 60%
- FIFO (First In, First Out)

**Cold Storage:**
- Walk-in cooler: 0-5°C
- Freezer: -18°C or below
- Daily temperature logs

### 3. Preparation

**Cross-Contamination Prevention:**
- Separate cutting boards (color-coded)
- Dedicated utensils
- Hand washing between tasks

**Personal Hygiene:**
- Clean uniforms daily
- Hair nets mandatory
- No jewelry
- Gloves when required

### 4. Cooking

**Minimum Internal Temperatures:**
- Poultry: 75°C
- Ground meat: 71°C
- Fish: 63°C
- Eggs: 71°C

### 5. Holding

**Hot Holding:** Above 60°C
**Cold Holding:** Below 5°C

**Time Limits:**
- Maximum 4 hours at safe temperature
- Discard after time limit

### 6. Cooling

**Two-Stage Cooling:**
1. 60°C to 21°C within 2 hours
2. 21°C to 5°C within 4 hours

### 7. Reheating

**Minimum Temperature:** 75°C for 15 seconds

## Monitoring

**Daily:**
- Temperature logs
- Equipment checks
- Staff hygiene inspections

**Weekly:**
- Deep cleaning schedules
- Pest control checks

**Monthly:**
- HACCP audit
- Municipality compliance review

## Training

All F&B staff must complete:
- HACCP fundamentals (annual)
- Food handler certification
- Allergen awareness

## Violations

**Immediate Action:**
- Product disposal
- Equipment shutdown
- Incident reporting

**Disciplinary:**
- First offense: Written warning
- Second offense: Suspension
- Third offense: Termination',
  'Comprehensive HACCP food safety policy with critical control points, temperature requirements, and compliance procedures.',
  'سياسة سلامة الغذاء الشاملة HACCP مع نقاط التحكم الحرجة ومتطلبات درجة الحرارة وإجراءات الامتثال.',
  (SELECT id FROM document_categories WHERE name = 'Corporate Policies' LIMIT 1),
  '00000000-0000-0000-0000-000000000003',
  'all_properties',
  'PUBLISHED',
  true,
  (SELECT id FROM profiles LIMIT 1),
  '739771e0-08ff-4e07-992f-d2be1770aa59',
  false
);

-- 2. Engineering Preventive Maintenance Guide (How-to Guide - Bilingual)
INSERT INTO documents (
  id, title, description, content_type, content, summary, summary_ar,
  category_id, department_id, visibility, status, requires_acknowledgment,
  created_by, property_id, is_deleted
) VALUES (
  gen_random_uuid(),
  'PHG-GUIDE-ENG-001: Preventive Maintenance Procedures',
  'Step-by-step guide for conducting preventive maintenance on hotel equipment and systems.',
  'Guide',
  '# Preventive Maintenance Procedures

**Document ID:** PHG-GUIDE-ENG-001  
**Department:** Engineering

## Purpose

Systematic preventive maintenance to minimize equipment downtime and extend asset life.

## Monthly PM Schedule

### HVAC Systems

**Air Handling Units:**

1. **Filter Inspection**
   - Remove and inspect filters
   - Clean or replace as needed
   - Log filter condition

2. **Belt Tension Check**
   - Inspect for wear
   - Adjust tension
   - Lubricate bearings

3. **Coil Cleaning**
   - Clean evaporator coils
   - Check condensate drains
   - Test thermostat calibration

**Chillers:**

1. Check refrigerant levels
2. Inspect compressor operation
3. Clean condenser coils
4. Test safety controls

### Electrical Systems

**Generator:**

1. Weekly load test (30 minutes)
2. Check oil level
3. Inspect battery terminals
4. Test automatic transfer switch

**Main Distribution:**

1. Thermal imaging scan
2. Tighten connections
3. Check breaker operation
4. Verify ground connections

### Plumbing Systems

**Water Heaters:**

1. Flush sediment
2. Test pressure relief valve
3. Check anode rod
4. Verify temperature settings

**Pumps:**

1. Check motor bearings
2. Inspect seals
3. Test pressure switches
4. Lubricate as needed

### Fire Safety

**Sprinkler System:**

1. Visual inspection
2. Test alarm valves
3. Check pressure gauges
4. Verify water flow

**Fire Pumps:**

1. Weekly run test
2. Check diesel fuel level
3. Inspect controller
4. Test automatic start

## Documentation

**Required for Each PM:**

- Date and time
- Technician name
- Equipment ID
- Findings
- Actions taken
- Parts used
- Next PM due date

## Emergency Contacts

- Chief Engineer: Ext. 5001
- Duty Manager: Ext. 5000
- Civil Defense: 998',
  'Complete preventive maintenance guide for hotel equipment including HVAC, electrical, plumbing, and fire safety systems.',
  'دليل الصيانة الوقائية الكامل لمعدات الفندق بما في ذلك أنظمة التكييف والكهرباء والسباكة والسلامة من الحرائق.',
  (SELECT id FROM document_categories WHERE name = 'Standard Operating Procedures' LIMIT 1),
  '00000000-0000-0000-0000-000000000004',
  'all_properties',
  'PUBLISHED',
  false,
  (SELECT id FROM profiles LIMIT 1),
  '739771e0-08ff-4e07-992f-d2be1770aa59',
  false
);

-- 3. HR Recruitment Checklist (Interactive Checklist - Arabic)
INSERT INTO documents (
  id, title, description, content_type, content, summary, summary_ar,
  category_id, department_id, visibility, status, requires_acknowledgment,
  created_by, property_id, is_deleted, checklist_items
) VALUES (
  gen_random_uuid(),
  'PHG-CHECK-HR-001: Recruitment Process Checklist',
  'Complete checklist for hiring new employees in compliance with KSA labor law.',
  'Checklist',
  '# Recruitment Process Checklist

**Document ID:** PHG-CHECK-HR-001  
**Department:** Human Resources

## قائمة التحقق من عملية التوظيف

استخدم هذه القائمة لضمان اكتمال جميع خطوات التوظيف.

## Pre-Recruitment

Use this checklist to ensure all recruitment steps are completed properly.

## Post-Offer

Ensure all documentation is complete before the start date.',
  'قائمة تحقق شاملة لعملية التوظيف مع متطلبات قانون العمل السعودي.',
  'Complete recruitment checklist with KSA labor law requirements.',
  (SELECT id FROM document_categories WHERE name = 'Standard Operating Procedures' LIMIT 1),
  '00000000-0000-0000-0000-000000000005',
  'department',
  'PUBLISHED',
  false,
  (SELECT id FROM profiles LIMIT 1),
  '739771e0-08ff-4e07-992f-d2be1770aa59',
  false,
  '[
    {"id": "hr1", "text": "Obtain manpower requisition approval from GM", "is_required": true},
    {"id": "hr2", "text": "Post job advertisement (internal & external)", "is_required": true},
    {"id": "hr3", "text": "Screen CVs and shortlist candidates", "is_required": true},
    {"id": "hr4", "text": "Conduct initial phone interviews", "is_required": false},
    {"id": "hr5", "text": "Schedule face-to-face interviews", "is_required": true},
    {"id": "hr6", "text": "Verify references and employment history", "is_required": true},
    {"id": "hr7", "text": "Request police clearance certificate", "is_required": true},
    {"id": "hr8", "text": "Conduct medical examination", "is_required": true},
    {"id": "hr9", "text": "Prepare employment contract (Arabic & English)", "is_required": true},
    {"id": "hr10", "text": "Submit Iqama/work visa application to MOHRSD", "is_required": true},
    {"id": "hr11", "text": "Enroll in GOSI (social insurance)", "is_required": true},
    {"id": "hr12", "text": "Create employee file and assign ID number", "is_required": true},
    {"id": "hr13", "text": "Schedule orientation and onboarding", "is_required": true}
  ]'::jsonb
);

-- 4. Finance Cash Handling Quick Reference (Quick Reference - English)
INSERT INTO documents (
  id, title, description, content_type, content, summary, summary_ar,
  category_id, department_id, visibility, status, requires_acknowledgment,
  created_by, property_id, is_deleted
) VALUES (
  gen_random_uuid(),
  'PHG-REF-FIN-001: Cash Handling Quick Reference',
  'Quick reference card for cash handling procedures and limits.',
  'Reference',
  '# Cash Handling Quick Reference

**Document ID:** PHG-REF-FIN-001  
**Department:** Finance

## Daily Cash Limits

| Position | Max Cash | Approval Required |
|----------|----------|-------------------|
| Cashier | SAR 10,000 | Supervisor |
| Front Desk | SAR 5,000 | Duty Manager |
| F&B Outlet | SAR 3,000 | Outlet Manager |
| Petty Cash | SAR 2,000 | Finance Manager |

## Cash Drop Procedure

**When to Drop:**
- Every 2 hours
- When limit reached
- End of shift

**Steps:**
1. Count cash
2. Complete drop envelope
3. Seal and sign
4. Witness signature
5. Drop in safe
6. Log in system

## Counterfeit Detection

**Check:**
- Watermark
- Security thread
- Color-shifting ink
- Microprinting

**If Suspected:**
1. Do NOT return to guest
2. Call Duty Manager
3. Complete incident report
4. Retain note securely

## Foreign Currency

**Accepted:**
- USD, EUR, GBP only
- Notes only (no coins)
- Max USD 500 per transaction

**Exchange Rate:**
- Use daily rate posted
- Round down to nearest SAR

## Emergency Contacts

- Finance Manager: Ext. 3001
- Duty Manager: Ext. 5000
- Security: Ext. 7000',
  'Quick reference for cash handling limits, procedures, and counterfeit detection.',
  'مرجع سريع لحدود التعامل النقدي والإجراءات واكتشاف التزييف.',
  (SELECT id FROM document_categories WHERE name = 'Standard Operating Procedures' LIMIT 1),
  '00000000-0000-0000-0000-000000000006',
  'all_properties',
  'PUBLISHED',
  false,
  (SELECT id FROM profiles LIMIT 1),
  '739771e0-08ff-4e07-992f-d2be1770aa59',
  false
);;
