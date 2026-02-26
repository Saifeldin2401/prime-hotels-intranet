-- PHASE 8: HUMAN-GRADE CONTENT POLISHING
-- Re-authoring core documents to meet professional hotel standards with high-fidelity formatting.

-- 1. POLISH NIGHT AUDIT GUIDE (Front Office/IT)
UPDATE public.documents 
SET content = '
# 🌑 PHG Master Guide: Night Audit & Daily Closure

This guide is intended for **Night Auditors** and **Front Office Managers**. Successful completion of this process ensures financial integrity and rolls the system into the next business day.

---

### 📋 Prerequisites
*   All active check-outs must be finalized.
*   All "No-Shows" must be updated in the PMS.
*   Cashier shifts for all outlets (F&B, Spa) must be closed.
*   Access to the **Manager''s Ledger** and **Trial Balance** reports.

---

## ⚙️ Phase 1: Preparation (23:00 - 01:00)

1.  **Verify Occupancy**: Audit the room list against physical registration cards.
2.  **Post Late Charges**: Manual posting of any late-night room service or minibar usage.
3.  **Clear Master Folios**: All internal PHG accounts must have a zero balance.

<div class="smart-alert smart-alert-note">
    <strong>Auditor''s Tip:</strong> Always double-check "Complimentary" rooms to ensure they have the correct override codes applied.
</div>

---

## 🚀 Phase 2: The Audit Execution

1.  Navigate to **PMS Menu > End of Day > Night Audit**.
2.  **Run Trial Balance**: Verify that total debits match total credits across all folios.
    <div class="smart-alert smart-alert-important">
        <strong>Critical:</strong> If the Trial Balance is "Out of Balance," do NOT proceed to the next step. Contact the IT Manager immediately.
    </div>
3.  **Process Room Charges**: The system will automatically post Room & Tax for all in-house guests.
4.  **System Backup**: Execute the "Nightly Snapshot" to the secure PHG offsite server.
5.  **Roll the Business Date**: Shift the system date to the current calendar day.

---

## 📅 Phase 3: Reports & Handover

Generate the following reports for the General Manager''s morning briefing:
*   **Manager''s Flash Report**: Summary of ADR, RevPAR, and Occupancy.
*   **High Balance Report**: Guests exceeding Credit Limit thresholds.
*   **Scanned Audit Pack**: Digital archive of all nightly transactions.

<div class="smart-alert smart-alert-warning">
    <strong>Warning:</strong> Ensure the printer has enough toner and PHG letterhead paper before starting the bulk report print.
</div>'
WHERE id = 'd0000000-0000-0000-0007-000000000003';

-- 2. POLISH HOUSEKEEPING SOP (HK Operations)
UPDATE public.documents 
SET content = '
# 🧹 PHG-SOP-HK-001: The 12-Step Perfect Room Sequence

Maintaining the PHG 5-Star sensory experience requires absolute adherence to this sequence. Every room must feel "untouched" by previous occupants.

---

### 🧴 Tools & Equipment Needed:
*   Standard HK Trolley (Fully stocked).
*   Color-coded microfiber cloths.
*   PHG Signature Scent spray.
*   HEPA-filter Vacuum Cleaner.

---

## 🏗️ The Execution Sequence

| Step | Action | Focus Point |
| :--- | :--- | :--- |
| **01** | **Knock & Announce** | Protect guest privacy; announce "Housekeeping" 3 times. |
| **02** | **Aration** | Open curtains and windows to eliminate stagnant air. |
| **03** | **Clear Trash** | Inspect for hidden items left by guests. |
| **04** | **Pre-Soak** | Apply chemical to bathroom fixtures. **Wait 5 mins**. |
| **05** | **Beds** | Triple-sheet method. 45-degree hospital corners. |
| **06** | **Dusting** | Clockwise rule. Top to bottom. |
| **07** | **Bathroom** | Polish chrome until mirror-finished. |
| **08** | **Replenish** | Reset amenities to the "PHG Brand Standard Layout." |
| **09** | **Vacuuming** | Start from the balcony/window and move toward the door. |
| **10** | **Final Sweep** | Remove any remaining hair or lint with a sticky roller. |

---

<div class="smart-alert smart-alert-important">
    <strong>Health & Safety: Color Coding Matrix</strong>
    <br/>- 🔴 <strong>Red</strong>: Toilet/Urinal area only.
    <br/>- 🟡 <strong>Yellow</strong>: Sinks and shower tiles.
    <br/>- 🔵 <strong>Blue</strong>: Mirrors, glass, and TV screens.
    <br/>- 🟢 <strong>Green</strong>: General furniture and dusting.
</div>

---

## ✨ Final Sensory Signature
Before exiting, ensure:
1.  **Lighting**: Reset to "Welcome Scene" (Lamp 1 and Entry light ON).
2.  **Scent**: Two sprays of PHG Morning Mist at head height.
3.  **Temperature**: AC set to 22°C (Standard).
'
WHERE id = 'd0000000-0000-0000-0007-000000000001';

-- 3. POLISH PRIVACY POLICY (Governance)
UPDATE public.documents 
SET content = '
# ⚖️ PHG-POL-GOV-002: Guest Privacy & Data Sensitivity

This policy establishes the mandatory standards for protecting **Personally Identifiable Information (PII)** within PHG properties, in full compliance with the **KSA Personal Data Protection Law (PDPL)**.

---

## 🛡️ Core Employee Obligations

### 1. Purpose Limitation
Staff may only access guest data (Mobile Number, ID, Credit Card) for the direct purpose of service delivery. Browsing guest profiles without an active business guest query is strictly prohibited.

### 2. Physical Security
Registration cards, bills, and any printed PII must never be left unattended on the desk.

<div class="smart-alert smart-alert-caution">
    <strong>Zero Tolerance:</strong> Taking photos of guest ID documents or credit cards on personal mobile devices is a summary dismissal offense under the PHG Code of Conduct.
</div>

---

## 📂 Data Disposal Standards

*   **Registration Cards**: Must be scanned and original shredded within 24 hours.
*   **Daily Reports**: Any guest lists used for operations must be placed in the **Blue Secure Bin** by the end of shift.
*   **External Requests**: Never confirm a guest room number or name to an external caller. Transfer calls to the room directly without verification.

---

<div class="smart-alert smart-alert-important">
    <strong>Compliance Notice:</strong> This policy is part of your mandatory employment contract. Failure to comply may lead to legal action under KSA PDPL statutes.
</div>
'
WHERE id = 'd0000000-0000-0000-0007-000000000002';
;
