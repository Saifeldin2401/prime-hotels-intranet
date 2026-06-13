-- PHASE 9: EXECUTIVE STANDARD CONTENT ROLLOUT

-- 1. HOUSEKEEPING SOP (Rooms Director Standard)
UPDATE public.documents 
SET content = '
# PHG Standard Operating Procedure: The 12-Step Guest Room Perfect Sequence

**Primary Audience:** Assistant Executive Housekeepers, Floor Supervisors, Guest Room Attendants.  
**Objective:** To deliver a "Never Lived In" sensory experience that adheres to the Prime Hotels Group 5-Star Hygiene and Presentation protocols.

---

## I. Preparation & Sanitization Protocols

Efficiency in Housekeeping is rooted in organized preparation. Every attendant must ensure their workstation (Trolley) is correctly commissioned before entering the guest floor.

1.  **Workstation Check:** Verify stocks of high-thread-count linen, PHG signature amenities, and color-coded microfiber cloths.
2.  **Chemical Safety:** Ensure all sanitization agents are Dilution-Control compliant.
3.  **The "Silent Entry":** Always knock three times, announcing "Housekeeping" clearly. If the "Privacy" indicator is active, document the time and move to the next assigned room.

<div class="smart-alert smart-alert-note">
    <strong>Supervisor’s Tip:</strong> Ventilation is the first step to a fresh room. Open all curtains and (where applicable) balcony doors immediately upon entry to allow for natural air circulation while you strip the linen.
</div>

---

## II. The Core Sequence (Cleaning & Restoration)

| Phase | Technical Execution | Brand Focus |
| :--- | :--- | :--- |
| **01** | **Stripping** | Remove all soiled linen and towels. High-dust the headboard and bed frame. |
| **02** | **Sanitization** | Pre-soak the bathroom fixtures. Focus on high-touch points (handles, switches). |
| **03** | **Bed-Making** | Use the PHG "Triple Sheet" method. Hospital corners at precisely 45 degrees. |
| **04** | **Restorative Dusting** | Clockwise motion, starting from the entrance. Use green-coded cloths for wood. |
| **05** | **Polishing** | Chrome fixtures must be free of wszelako water spots. Mirror finish is mandatory. |
| **06** | **Amenity Reset** | Align all stationery and bathroom items to the "Master Layout" (see Appendix A). |
| **07** | **Vacuuming** | Start from the furthest corner; overlap strokes for a "Deep Clean" finish. |

---

## III. The Sensory Signature (Final Inspection)

Before requesting a Supervisor inspection, the attendant must verify the PHG Sensory Signature:

*   **Olfactory:** Apply two mists of "PHG Signature Oud" at the center of the room.
*   **Thermal:** Reset the thermostat to a welcoming 22°C (Regional KSA Standard).
*   **Illumination:** Lamps 1 and 2 must be ON; curtains set to "Welcome" half-open position.

<div class="smart-alert smart-alert-important">
    <strong>Health & Safety Warning:</strong> Never mix cleaning chemicals. Use the RED microfiber cloth for toilet sanitization only to prevent cross-contamination.
</div>
'
WHERE id = 'd0000000-0000-0000-0007-000000000001';

-- 2. PRIVACY POLICY (Governance/Legal Standard)
UPDATE public.documents 
SET content = '
# Corporate Policy: Guest Privacy & Data Sensitivity (PDPL Compliance)

**Owner:** Department of Legal & Compliance.  
**Scope:** All PHG Properties, Kingdom of Saudi Arabia.  
**Effective Date:** 25 December 2025.

---

## I. Legal Mandate & Purpose

This policy establishes the mandatory standards for the collection, processing, and storage of **Personally Identifiable Information (PII)** within Prime Hotels Group. Adherence is non-negotiable and aligns with the **KSA Personal Data Protection Law (PDPL)** and international data sovereignty standards.

---

## II. Core Governance Principles

### 1. The Principle of Purpose
Staff are strictly authorized to access guest data (including passport copies, mobile numbers, and credit card folios) **only** when actively facilitating a guest transaction or request. Unauthorized "browsing" of guest history is a violation of the PHG Code of Ethics.

### 2. Transactional Security
At no point during the Check-in or Check-out process should a guest’s PII be left visible to others. Registration cards must be turned over immediately after signature.

<div class="smart-alert smart-alert-caution">
    <strong>Strict Prohibition:</strong> The use of personal mobile devices to capture images of guest ID documents or payment cards is a summary dismissal offense. All scanning must be performed via the approved property hardware.
</div>

---

## III. Data Retention & Secure Disposal

Operating in the Kingdom of Saudi Arabia requires specific document retention periods. 

*   **Digital Records:** Must be encrypted at rest and masked in all public UI views.
*   **Physical Records:** Any printed guest lists or folio drafts must be deposited in the **Certified Secure Destruction bins** at the end of every shift.
*   **External Verification:** Front Office staff must never confirm guest occupancy to third parties without a verified government-issued warrant or the express written consent of the guest.

---

<div class="smart-alert smart-alert-important">
    <strong>Compliance Accountability:</strong> Department Heads are responsible for ensuring 100% policy awareness. Random audits of PMS access logs are conducted monthly by the Regional Compliance Office.
</div>
'
WHERE id = 'd0000000-0000-0000-0007-000000000002';

-- 3. EMERGENCY MATRIX (Security Command Standard)
UPDATE public.documents 
SET content = '
# PHG Security Protocol: Emergency Code Matrix & First Response

**Primary Audience:** All Hotel Staff, Security Personnel, Duty Managers.  
**Authority:** Director of Security / KSA Civil Defense Liaison.

---

## I. Tactical Response Overview

In the event of an emergency, the safety of guests and colleagues is our absolute priority. Staff must remain calm and execute the specific protocols associated with each code.

<div class="smart-alert smart-alert-important">
    <strong>Immediate Alarm: Dial 999</strong> from any house phone to reach the Security Command Center.
</div>

---

## II. Code Definitions & Immediate Actions

| Code | Threat Type | Immediate Protocol |
| :--- | :--- | :--- |
| **CODE RED** | Fire or Smoke | **R.A.C.E.** (Rescue, Alarm, Contain, Extinguish). Evacuate to Assembly Point A. |
| **CODE BLUE** | Medical Emergency | DO NOT move the patient. Request AED and contact the on-site Nurse. |
| **CODE ORANGE** | Suspicious Package | Do not touch. Cordon off the area (50m). Use landlines only (no radios). |
| **CODE BLACK** | Armed Intruder | **Run, Hide, Tell.** Initiate property-wide lockdown via the DSO. |

---

## III. Evacuation & Crowd Control

*   **Stairwells:** Always prioritize the use of pressurized fire stairs. **Never use elevators** during an active Code Red.
*   **Guest Communication:** Use firm but reassuring language. "Please follow me to the safe assembly area" (Arabic: "يرجى اتباعي إلى منطقة التجمع الآمنة").
*   **Accountability:** Department Heads must account for all rostered staff at the assembly point within 10 minutes of evacuation.

<div class="smart-alert smart-alert-warning">
    <strong>Warning:** Failure to adhere to Civil Defense protocols can result in property-wide fines and legal liability for the individual staff member involved.
</div>
'
WHERE id = 'd0000000-0000-0000-0007-000000000005';

-- 4. HR FAQ (HR Director Standard)
UPDATE public.documents 
SET content = '
# PHG Colleague Guide: Annual Leave & Air Ticket Policy

**Owner:** Regional Director of Human Resources.  
**Context:** This guide provides clarity on legal entitlements under the KSA Labor Law and specific PHG regional benefits.

---

## I. Annual Leave Entitlement

At Prime Hotels Group, we recognize the importance of rest and rejuvenation. As per KSA statues, all colleagues are entitled to:

*   **30 Calendar Days** of paid annual leave per year.
*   Requests should be submitted via the **Colleague Portal** at least 45 days in advance.
*   Leave is subject to operational requirements, particularly during peak seasons (Ramadan, Eid, and Hajj periods).

<div class="smart-alert smart-alert-note">
    <strong>HR Director’s Note:** Planning your leave early allows us to manage departmental coverage effectively and ensures you get your preferred dates.
</div>

---

## II. Air Ticket Benefit

We facilitate travel for our international colleagues to visit their home countries.

1.  **Entitlement:** One return economy air ticket to your home destination for every **two years** of completed service.
2.  **Encashment:** In specific circumstances, ticket encashment may be permitted with the approval of both the GM and the Regional HR Director.
3.  **Booking:** All travel must be coordinated through the HR Travel Desk to ensure compliance with corporate travel partners.

---

## III. Frequently Asked Questions

**Q: Can I carry over my unused leave?**  
A: Colleagues may carry over a maximum of 15 days to the following calendar year, provided there is a written agreement with the Department Head.

**Q: Am I entitled to leave salary before I travel?**  
A: Yes. Leave salary is processed and disbursed with the final payroll cycle prior to your departure date.

---

<div class="smart-alert smart-alert-important">
    <strong>Legal Disclaimer:** These benefits are governed by the terms of your individual contract and the prevailing laws of the Kingdom of Saudi Arabia.
</div>
'
WHERE id = 'd0000000-0000-0000-0007-000000000006';

-- 5. FRONT DESK CHECKLIST (FO Manager Standard)
UPDATE public.documents 
SET content = '
# Operational Checklist: Front Desk Opening (Morning Shift)

**Primary Audience:** Front Desk Agents, Shift Leaders, Guest Service Officers.  
**Standard Time:** 07:00 AM Promptly.

---

## I. Handover & Financial Integrity

The transition from the Night Audit team is the foundation of a successful morning.

1.  **Shift Briefing:** Review the Night Manager’s report. Pay particular attention to guest complaints or maintenance issues from the late-night hours.
2.  **Float Verification:** Count and verify the Petty Cash float. Both shifts must sign the handover log.
3.  **PMS Reconciliation:** Ensure the Night Audit has been completed and that the Business Date has rolled successfully.

<div class="smart-alert smart-alert-note">
    <strong>FOM’s Tip:** The lobby is our stage. Walk the Front Desk perimeter before the first guest arrives—ensure all pens are aligned, brochures are stocked, and the signature scent is present.
</div>

---

## II. VIP & Arrival Preparation

1.  **VIP-1 / VIP-2 Audit:** Verify that all VIP rooms are "Inspected" and ready for early check-in. Coordinate with Room Service for arrival amenity timing.
2.  **Group Arrivals:** Review the day’s group movements. Ensure key packets are pre-cut and registration cards are pre-printed.
3.  **Expected Early Arrivals:** Prioritize guest rooms for any travelers arriving from international red-eye flights.

---

<div class="smart-alert smart-alert-important">
    <strong>Operational Standard:** All guest interactions must follow the "PHG 5-Star Hafa-wah" greeting standards. Acknowledgment must occur within 10 seconds of a guest approaching the desk.
</div>
'
WHERE id = 'd0000000-0000-0000-0007-000000000004';
;
