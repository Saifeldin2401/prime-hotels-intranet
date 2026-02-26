-- PHASE 7: RICH CONTENT ECOSYSTEM INJECTION

-- 1. INJECT DETAILED SOP (Housekeeping)
INSERT INTO public.documents (
    id, title, description, summary, content, content_type, 
    status, category_id, department_id, visibility, created_by, property_id,
    requires_acknowledgment
) VALUES (
    'd0000000-0000-0000-0007-000000000001', 
    'PHG-SOP-HK-001: Guest Room Perfect Sequence', 
    'The systematic 12-step process for cleaning and refreshing a checkout room to PHG 5-star standards.',
    'Complete the room refresh in 25 minutes while maintaining absolute 5-star hygiene standards. Follow the clockwise cleaning rule.',
    '# PHG Guest Room Perfect Sequence

## 📋 Standard Objective
To ensure every guest enters a room that feels "never lived in," adhering to PHG 5-star sensory standards.

## 🕒 Target Duration
- **Checkout Room**: 25-30 Minutes
- **Stay-over Room**: 15-20 Minutes

## 🏗️ The 12-Step Sequence
1. **Knock & Announce**: Knock 3 times, announce "Housekeeping."
2. **Ventilation**: Open curtains and windows (if applicable) for fresh air.
3. **Strip Linen**: Remove all used towels and bed linen. High-dust the headboard.
4. **Empty Trash**: Clear all bins and sanitize.
5. **Bathroom Pre-soak**: Apply chemicals to tub/shower and toilet; leave to work.
6. **Dusting (Clockwise)**: Start from the door, move clockwise. Dust all surfaces, including vents.
7. **Bed Making**: Use "Triple Sheet" PHG standard. Ensure sharp corners.
8. **Bathroom Cleaning**: Scrub then polish all fixtures. Chrome must shine.
9. **Replenishment**: Reset amenities, coffee tray, and stationery.
10. **Vaccuming**: Start from the furthest corner and move toward the door.
11. **Final Fragrance**: Light spray of PHG Signature Scent.
12. **Inspection**: Final visual "sweep" before closing the door.

---
**Compliance Alert**: Always use color-coded cloths to prevent cross-contamination.
- Red: Toilet/Urinals
- Yellow: Washbasins/Tiles
- Blue: Glass/Mirrors
- Green: General Furniture',
    'SOP',
    'PUBLISHED', 
    'c0000000-0000-0000-0000-000000000002', 
    '00000000-0000-0000-0000-000000000002', 
    'all_properties', 
    'a927ec40-0af0-47d7-8258-9decad0cac9c', 
    '739771e0-08ff-4e07-992f-d2be1770aa59',
    true
) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, summary = EXCLUDED.summary;

-- 2. INJECT POLICY DOCUMENT
INSERT INTO public.documents (
    id, title, description, summary, content, content_type, 
    status, category_id, department_id, visibility, created_by, property_id,
    requires_acknowledgment
) VALUES (
    'd0000000-0000-0000-0007-000000000002', 
    'PHG-POL-GOV-002: Guest Privacy & Data Sensitivity', 
    'Official corporate policy for handling guest data and PII within PHG properties.',
    'Zero tolerance for unauthorized sharing of guest data. All PII must be encrypted at rest and masked in public views.',
    '# PHG Guest Privacy & Data Sensitivity Policy

## ⚖️ Legal Framework
This policy adheres to the **KSA Personal Data Protection Law (PDPL)** and international GDPR standards.

## 🛡️ Core Principles
1. **Purpose Limitation**: Data collected only for guest stay and legal requirements.
2. **Confidentiality**: Guest names and room numbers are NEVER to be disclosed over the phone or to visitors without guest consent.
3. **Data Disposal**: Shredding of registration cards and sensitive printouts is mandatory daily.

## 🚫 Prohibited Acts
- Taking photos of guest ID documents on personal phones.
- Sharing guest occupancy lists with unauthorized departments.
- Leaving Registration Cards unattended on the Front Desk.',
    'Policy',
    'PUBLISHED', 
    'c0000000-0000-0000-0000-000000000001', 
    '00000000-0000-0000-0000-000000000010', 
    'all_properties', 
    'a927ec40-0af0-47d7-8258-9decad0cac9c', 
    '739771e0-08ff-4e07-992f-d2be1770aa59',
    true
) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;

-- 3. INJECT HOW-TO GUIDE
INSERT INTO public.documents (
    id, title, description, summary, content, content_type, 
    status, category_id, department_id, visibility, created_by, property_id
) VALUES (
    'd0000000-0000-0000-0007-000000000003', 
    'PHG-GUIDE-FO-015: Master Your PMS: Night Audit Procedures', 
    'Technical walkthrough for completing the nightly financial closure.',
    'The Night Audit ensures financial reconciliation between Folios, Cash, and Credit cards before the new business day starts.',
    '# PHG Night Audit Guide

## 🌑 Preparation (23:00 - 01:00)
1. **Verify No-Shows**: Ensure all expected arrivals that didn''t show are marked "No-Show."
2. **Post Remaining Charges**: Verify all Room Service and Minibar charges are posted.
3. **Clear Master Folios**: Close all internal expense accounts.

## ⚙️ The Audit Process
1. Navigate to **Opera > End of Day > Night Audit**.
2. Run **Trial Balance** to check for discrepancies.
3. Process **Room Charges**.
4. Run **System Backup**.
5. Roll the **Business Date**.

## 📊 Reports to Print
- Manager''s Flash Report
- High Balance Report
- Arrival/Departure List (Next Day)',
    'Guide',
    'PUBLISHED', 
    'c0000000-0000-0000-0000-000000000002', 
    '00000000-0000-0000-0000-000000000001', 
    'all_properties', 
    'a927ec40-0af0-47d7-8258-9decad0cac9c', 
    '739771e0-08ff-4e07-992f-d2be1770aa59'
) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;

-- 4. INJECT INTERACTIVE CHECKLIST
INSERT INTO public.documents (
    id, title, description, summary, content, content_type, 
    status, category_id, department_id, visibility, created_by, property_id,
    checklist_items
) VALUES (
    'd0000000-0000-0000-0007-000000000004', 
    'PHG-CHECK-FO-001: Front Desk Opening Shift', 
    'Daily operational checklist for the Morning Shift team.',
    'Morning shift handover is critical. Ensure all VIP arrivals are verified and the float is balanced.',
    '# Morning Shift Opening Checklist
Follow these steps daily at 07:00 AM sharp.',
    'Checklist',
    'PUBLISHED', 
    'c0000000-0000-0000-0000-000000000002', 
    '00000000-0000-0000-0000-000000000001', 
    'all_properties', 
    'a927ec40-0af0-47d7-8258-9decad0cac9c', 
    '739771e0-08ff-4e07-992f-d2be1770aa59',
    '[
        {"id": "c1", "task": "Count Float & Sign Cash Handover", "required": true},
        {"id": "c2", "task": "Check Duty Manager Log for any Night Shift incidents", "required": true},
        {"id": "c3", "task": "Verify VIP-1 & VIP-2 Arrival Rooms are Ready", "required": true},
        {"id": "c4", "task": "Check Breakfast Buffet Guest List accuracy", "required": false}
    ]'::jsonb
) ON CONFLICT (id) DO UPDATE SET checklist_items = EXCLUDED.checklist_items;

-- 5. INJECT QUICK REFERENCE
INSERT INTO public.documents (
    id, title, description, summary, content, content_type, 
    status, category_id, department_id, visibility, created_by, property_id
) VALUES (
    'd0000000-0000-0000-0007-000000000005', 
    'PHG-REF-SEC-09: Emergency Code Response Matrix', 
    'Immediate reference for emergency situations and protocols.',
    'One-page matrix for first responders. Memorize the codes.',
    '# Emergency Code Matrix

| Code | Situation | Immediate Action |
| :--- | :--- | :--- |
| **CODE RED** | Fire / Smoke | Secure the area, Call 998 (Civil Defense) |
| **CODE BLUE** | Medical Emergency | Call internal Nurse, then 997 (Ambulance) |
| **CODE ORANGE** | Bomb Threat / Suspicious Package | Do not touch, Evacuate 500m radius |
| **CODE BLACK** | Armed Intruder / Lockdown | Run, Hide, Tell. Lock all service lifts. |

**Internal Emergency Ext: 999**',
    'Reference',
    'PUBLISHED', 
    'c0000000-0000-0000-0000-000000000004', 
    '00000000-0000-0000-0000-000000000007', 
    'all_properties', 
    'a927ec40-0af0-47d7-8258-9decad0cac9c', 
    '739771e0-08ff-4e07-992f-d2be1770aa59'
) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;

-- 6. INJECT FAQ
INSERT INTO public.documents (
    id, title, description, summary, content, content_type, 
    status, category_id, department_id, visibility, created_by, property_id,
    faq_items
) VALUES (
    'd0000000-0000-0000-0007-000000000006', 
    'PHG-FAQ-HR-003: Employee Vacation & Air Ticket FAQ', 
    'Frequently asked questions regarding leave entitlement and travel benefits.',
    'Everything you need to know about your 30-day annual leave and bi-annual ticket entitlement.',
    '# HR Benefits FAQ
Find answers to the most common questions about leave and air tickets.',
    'FAQ',
    'PUBLISHED', 
    'c0000000-0000-0000-0000-000000000001', 
    '00000000-0000-0000-0000-000000000005', 
    'all_properties', 
    'a927ec40-0af0-47d7-8258-9decad0cac9c', 
    '739771e0-08ff-4e07-992f-d2be1770aa59',
    '[
        {"question": "How many days of annual leave do I have?", "answer": "All PHG staff are entitled to 30 calendar days per year as per KSA Labor Law."},
        {"question": "When can I request my air ticket?", "answer": "Staff are eligible for a return air ticket to their home country after every 2 years of service."},
        {"question": "Can I encash my leave?", "answer": "Encashment is only permitted upon final exit or with express approval from the GM/HR Director."}
    ]'::jsonb
) ON CONFLICT (id) DO UPDATE SET faq_items = EXCLUDED.faq_items;

-- 7. INJECT TRAINING MODULES
INSERT INTO public.training_modules (
    id, title, description, department_id, is_active, 
    difficulty_level, estimated_duration, created_by, property_id, status
) VALUES (
    'e0000000-0000-0000-0007-000000000001', 
    'Housekeeping Excellence: The Perfect Sequence', 
    'Master the 12-step room refresh process to maintain PHG 5-star standards.',
    '00000000-0000-0000-0000-000000000002', 
    true, 
    'beginner', 
    '45 mins', 
    'a927ec40-0af0-47d7-8258-9decad0cac9c', 
    '739771e0-08ff-4e07-992f-d2be1770aa59', 
    'published'
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO public.training_modules (
    id, title, description, department_id, is_active, 
    difficulty_level, estimated_duration, created_by, property_id, status
) VALUES (
    'e0000000-0000-0000-0007-000000000002', 
    'Data Privacy Specialist Certificate', 
    'Mandatory training on KSA PDPL compliance and PHG guest data protection rules.',
    '00000000-0000-0000-0000-000000000010', 
    true, 
    'intermediate', 
    '30 mins', 
    'a927ec40-0af0-47d7-8258-9decad0cac9c', 
    '739771e0-08ff-4e07-992f-d2be1770aa59', 
    'published'
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- 8. INJECT QUIZZES
INSERT INTO public.quizzes (
    id, title, description, duration_minutes, passing_score, 
    status, created_by, property_id, training_id
) VALUES (
    'f0000000-0000-4000-a000-000000000001',
    'Housekeeping Sequence Assessment',
    'Verify your knowledge of the 12-step perfect room sequence.',
    15, 80, 'pending', 'a927ec40-0af0-47d7-8258-9decad0cac9c', 
    '739771e0-08ff-4e07-992f-d2be1770aa59', 'e0000000-0000-0000-0007-000000000001'
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

INSERT INTO public.quizzes (
    id, title, description, duration_minutes, passing_score, 
    status, created_by, property_id, training_id
) VALUES (
    'f0000000-0000-4000-a000-000000000002',
    'Data Privacy Compliance Test',
    'Official certification exam for KSA PDPL and PHG data rules.',
    10, 100, 'pending', 'a927ec40-0af0-47d7-8258-9decad0cac9c', 
    '739771e0-08ff-4e07-992f-d2be1770aa59', 'e0000000-0000-0000-0007-000000000002'
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

-- 9. INJECT QUIZ QUESTIONS
INSERT INTO public.quiz_questions (
    id, quiz_id, question_text, question_type, 
    option_a, option_b, option_c, option_d, 
    correct_answer, points, order_num
) VALUES 
(gen_random_uuid(), 'f0000000-0000-4000-a000-000000000001', 'What is the target duration for cleaning a checkout room?', 'multiple_choice', '15 mins', '25-30 mins', '45 mins', '60 mins', 'B', 10, 1),
(gen_random_uuid(), 'f0000000-0000-4000-a000-000000000001', 'In which direction should dusting be performed?', 'multiple_choice', 'Randomly', 'Counter-clockwise', 'Clockwise', 'Top-down only', 'C', 10, 2),
(gen_random_uuid(), 'f0000000-0000-4000-a000-000000000001', 'What color cloth is used for disinfecting toilets?', 'multiple_choice', 'Blue', 'Green', 'Yellow', 'Red', 'D', 10, 3);

INSERT INTO public.quiz_questions (
    id, quiz_id, question_text, question_type, 
    option_a, option_b, option_c, option_d, 
    correct_answer, points, order_num
) VALUES 
(gen_random_uuid(), 'f0000000-0000-4000-a000-000000000002', 'Is it allowed to take photos of guest IDs on a personal phone?', 'multiple_choice', 'Yes, for backup', 'No, never', 'Only if the guest agrees', 'Only for VIPs', 'B', 10, 1),
(gen_random_uuid(), 'f0000000-0000-4000-a000-000000000002', 'What should you do with used registration cards?', 'multiple_choice', 'Throw in general trash', 'Keep in drawer', 'Shred them', 'Take home', 'C', 10, 2);
;
