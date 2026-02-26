-- RE-AUTHORING NIGHT AUDIT GUIDE TO EXECUTIVE STANDARD

UPDATE public.documents 
SET content = '
# PHG Operational Standard: Night Audit & Daily Financial Closure

**Primary Audience:** Night Auditors, Front Office Managers (FOM), Assistant Front Office Managers (AFOM).  
**Scope:** Regional (Kingdom of Saudi Arabia Operations).  
**Objective:** To ensure the accurate reconciliation of the day’s revenue and the successful transition of the PMS to the next business date.

---

## I. Preparation & Pre-Audit Checks (23:00 - 01:00)

The success of the audit depends on the accuracy of the day’s records. Before initiating the automated cycle, the following manual verifications are mandatory.

1.  **Guest Status Finalization:** Identify and process all Departures who failed to check out. Ensure all "Checked-Out" guest folios have a zero balance.
2.  **No-Show Management:** Review the Arrival list. For any guest who has not arrived by 01:00, update their status to "No-Show" and apply the appropriate cancellation fees as per property policy.
3.  **Revenue Reconciliation:** Ensure that all outlets (Food & Beverage, Spa, etc.) have successfully closed their POS systems and that receipts match the PMS interface totals.
4.  **Master Folios:** Verify that house accounts and master folios used for internal expenses are current and cleared.

<div class="smart-alert smart-alert-note">
    <strong>Auditor’s Tip:</strong> Start your room rate audit early (around 22:30). Identifying a master billing error early saves significant time during the high-pressure audit execution phase.
</div>

---

## II. The Audit Execution Phase

Once all pre-checks are confirmed, proceed to the main audit module within the PMS. 

1.  **Pre-Audit Reporting:** Generate the *House Status* and *Guest In-House* reports to have a physical record in the event of a system interruption during the batch process.
2.  **Trial Balance Review:** Open the Trial Balance. Ensure that the total debits and credits are equal.
3.  **Posting Room & Tax:** Initiate the batch posting for all occupied rooms.
4.  **Systems Audit:** The system will check for any open shifts or unposted charges. Resolve any blocking alerts immediately.
5.  **Rolling the Business Date:** Confirm the date change. The system will now transition to the new business day.

<div class="smart-alert smart-alert-important">
    <strong>Critical:</strong> If the system reports a "Financial Imbalance" error, do NOT attempt to force the date roll. Halt the process and contact the IT Duty Manager and the Director of Finance immediately.
</div>

---

## III. Post-Audit & Financial Reporting (03:00 - 05:00)

After the system rolls over, focus shifts to auditing the accuracy of the closure and preparing management reports.

1.  **Night Manager’s Log:** Document any significant incidents, guest complaints, or system issues. This is the primary communication tool for the Daily Morning Briefing.
2.  **Management Reporting Kit:** Prepare the digital "Audit Pack" including:
    *   **The Manager’s Flash Report:** Overview of final Occupancy, ADR, and RevPAR.
    *   **High Balance Report:** Flags any guest folios approaching or exceeding authorized credit limit thresholds.
    *   **Market Segment Report:** Breakdown of the day''s production by source.
3.  **Systems Backup Verification:** Confirm the automated cloud backup has initiated successfully.

<div class="smart-alert smart-alert-warning">
    <strong>Warning:</strong> Ensure that all physical registration cards for the day’s arrivals are filed securely and that any printed guest ID copies are processed for shredding as per KSA Privacy Laws and PDPL requirements.
</div>

---

## IV. Handover Protocol

A smooth transition to the morning shift is vital for operational continuity.

*   Hand over the Duty Manager mobile and master keys to the incoming Morning Shift Lead.
*   Brief the Team Leader on expected Early Arrivals and VIP-1 guests.
*   Sign off on the Petty Cash float reconciliation.
'
WHERE id = 'd0000000-0000-0000-0007-000000000003';
;
