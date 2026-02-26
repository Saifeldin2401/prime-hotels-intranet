-- PHASE 8: HUMAN-GRADE CONTENT POLISHING (PART 2)

-- 1. POLISH INTERACTIVE CHECKLIST (Front Office)
UPDATE public.documents 
SET content = '
# 📋 Daily Checklist: Front Desk Opening Shift (07:00)

This checklist ensures a seamless transition from the Night Shift to Morning operations. Complete all mandatory items before the first wave of check-outs.

---

### ☀️ Morning Setup Checklist
Please check the items below as you complete them. If any critical discrepancy is found in the Float, notify the Duty Manager immediately.

<div class="smart-alert smart-alert-note">
    <strong>Note:</strong> Friendly service starts with a smile. Ensure the "PHG Signature Scent" is active in the lobby before 07:15.
</div>
'
WHERE id = 'd0000000-0000-0000-0007-000000000004';

-- 2. POLISH FAQ (HR)
UPDATE public.documents 
SET content = '
# ✈️ PHG HR Benefits: Vacation & Air Ticket FAQ

We value your hard work and want to ensure you maximize your rest and benefits. If your question is not answered below, please visit the HR Hub on the 2nd floor.

---

<div class="smart-alert smart-alert-note">
    <strong>HR Notice:</strong> Standard leave requests should be submitted via the Portal at least 30 days in advance to ensure hotel coverage.
</div>

---

### 🛡️ Legal Disclaimer
These answers are based on the PHG Employee Handbook and the **KSA Labor Law**. In case of conflict, the physical contract and KSA law prevail.
'
WHERE id = 'd0000000-0000-0000-0007-000000000006';

-- 3. POLISH QUICK REFERENCE (Security)
UPDATE public.documents 
SET content = '
# 🚨 PHG Emergency Code Matrix: Quick Reference

**Memorize these codes.** Every second counts in an emergency. This card is for immediate action—consult the full SOP-SEC-101 for detailed evacuation paths.

---

<div class="smart-alert smart-alert-important">
    <strong>Emergency Extension: Dial 999</strong> from any internal phone to reach the Security Command Center.
</div>

---

### 🏗️ Responder Obligations
1.  **Stay Calm**: Your voice sets the tone for guest safety.
2.  **Report**: Use clear, concise radio communication.
3.  **Direct**: Guide guests to the nearest safe assembly point.

---

<div class="smart-alert smart-alert-warning">
    <strong>Caution:</strong> Do NOT use elevators during Code Red or Code Orange.
</div>
'
WHERE id = 'd0000000-0000-0000-0007-000000000005';
;
