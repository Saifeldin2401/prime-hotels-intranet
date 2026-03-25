-- Migration: 20260324200000_overhaul_legacy_modules_content.sql
-- Description: Completely replaces sparse placeholder text in 8 original LMS modules with enterprise-grade SOP materials. Markdown formatted.
-- Excludes: "Guest Rights and Stay Disclosure" per user request.

BEGIN;

DO $$ 
DECLARE
  v_admin_id UUID := 'a927ec40-0af0-47d7-8258-9decad0cac9c'; -- System / Admin user
BEGIN

  -- 1. CLEAN UP EXISTING CONTENT BLOCKS FOR THE 8 MODULES
  DELETE FROM public.training_content_blocks WHERE training_module_id IN (
    '2ec5b4fd-eed7-4961-be0f-d24287bb30d9', -- FO: Check-in Check-out
    '61000000-0000-4000-8000-000000000001', -- HR: Onboarding
    '61000000-0000-4000-8000-000000000002', -- HS: Room Turnover
    '61000000-0000-4000-8000-000000000003', -- ER: Fire
    '61000000-0000-4000-8000-000000000004', -- IT: Cyber
    '61000000-0000-4000-8000-000000000005', -- FI: Cash
    '61000000-0000-4000-8000-000000000006', -- EN: PM
    '61000000-0000-4000-8000-000000000007'  -- SE: Incident
  );


  -- =========================================================================
  -- MODULE 1: Front Office: Check-in & Checkout (2ec5b4fd-eed7-4961-be0f-d24287bb30d9)
  -- =========================================================================
  INSERT INTO public.training_content_blocks(id, training_module_id, title, content, type, "order", is_mandatory) VALUES
  (
    gen_random_uuid(), '2ec5b4fd-eed7-4961-be0f-d24287bb30d9', 
    'The 10-Step Arrival Sequence', 
    '### The 10-Step Arrival Sequence

The arrival experience is our first physical interaction with the guest. A flawless check-in sets the tone for the entire stay. All Front Office personnel must adhere to the 10-step sequence:

1. **The Greeting (10/5 Rule):** Make eye contact at 10 feet. Smile and verbally greet the guest at 5 feet. Use the time of day: *"Good afternoon, welcome to Prime Hotels."*
2. **Retrieve the Reservation:** Confirm the last name gently. Match the profile in Opera/PMS.
3. **Verify ID & Passport:** In compliance with KSA laws (Absher integration), physically verify the National ID or Iqama for residents, and Passports with Visa stamps for international travelers.
4. **Confirm Stay Details:** Reiterate the number of nights, room type, and package (e.g., Breakfast inclusion). **Notice:** Never say the room number out loud! State: *"I have a beautiful Deluxe King reserved for you..."*
5. **Secure Payment / Pre-Auth:** Obtain the physical credit card to pre-authorize the room rate plus a standard incidental hold of 500 SAR per night. DO NOT assume the card on file is the one they are using.
6. **Sign Registration Card:** Ensure they sign the digital or physical reg card. Explain the non-smoking policy.
7. **Present the Key:** Write the room number on the key jacket. Hand it to the guest with both hands. Say: *"Your room is on the 5th floor. The elevators are to your right."*
8. **Offer Luggage Assistance:** Signal the Bell Team immediately if the guest has luggage.
9. **Highlight Amenities:** Briefly mention breakfast timings and health club locations.
10. **Warm Farewell:** *"Mr. Smith, if you need absolutely anything, please press the Prime Connect button on your room phone. Enjoy your stay."*',
    'text', 1, true
  ),
  (
    gen_random_uuid(), '2ec5b4fd-eed7-4961-be0f-d24287bb30d9', 
    'Departure Excellence & Dispute Resolution', 
    '### Departure Excellence & Folio Disputes

Checkout is the last impression. Efficiency and empathy are paramount.

**The Golden Departure Sequence:**
* Ask the magic question: *"How was your stay with us?"* Listen intently.
* If the stay was flawed, pause the checkout, offer apologies, and involve a Duty Manager immediately to perform service recovery before the guest leaves the building.

**Handling Folio Disputes:**
Guests will frequently challenge Mini-Bar charges, Laundry rush fees, or Restaurant checks.
1. **Print/Display the Folio:** Review the charges line-by-line with the guest.
2. **Listen:** Do not interrupt when they challenge a charge.
3. **Verify:** Check the signed POS receipt. If there is no signature, or the guest adamantly denies a 20 SAR minibar charge, **empowerment applies**. Remove minor disputed charges immediately to preserve the relationship.
4. **Finalize:** Settle the balance, offer a final receipt via email, and say: *"Thank you for staying with Prime Hotels, we hope to welcome you back soon."*',
    'text', 2, true
  ),
  (
    gen_random_uuid(), '2ec5b4fd-eed7-4961-be0f-d24287bb30d9', 
    'Knowledge Check', 'Please complete the final quiz to validate your understanding of Check-in and Checkout sequences.', 
    'quiz', 3, true
  );
  UPDATE public.training_content_blocks SET content_data = jsonb_build_object('quiz_id', '508f359f-86cd-4b40-879e-7367c0b9db2e') WHERE title = 'Knowledge Check' AND training_module_id = '2ec5b4fd-eed7-4961-be0f-d24287bb30d9';


  -- =========================================================================
  -- MODULE 2: HR Onboarding (61000000-0000-4000-8000-000000000001)
  -- =========================================================================
  INSERT INTO public.training_content_blocks(id, training_module_id, title, content, type, "order", is_mandatory) VALUES
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000001', 
    'Prime Brand Culture & Grooming Standards', 
    '### Brand Culture & Unwavering Grooming Standards

Welcome to Prime Hotels. Our brand is built on absolute dedication to guest luxury and cultural respect. 

**Our Nametag is Our Badge of Honor**
You must always wear your nametag on the left lapel. It ensures the guest can connect with you personally.

**Grooming Standards (The Prime Look):**
* **Hair:** Must be well-kept, tied back if extending past the shoulders (especially for F&B/Culinary departments). Hair color must be natural tones.
* **Jewelry:** Minimalist. One ring per hand (wedding bands accepted). One small stud earring per ear. No visible necklaces in uniform.
* **Tattoos:** No visible tattoos. Any tattoos must be completely covered by the uniform.
* **Hygiene:** Bathe daily. Use antiperspirant. Absolutely no strong perfumes or colognes, as they can cause allergic reactions for guests in enclosed spaces like elevators or restaurants.
* **Uniform Care:** Your uniform must be crisply ironed, with no missing buttons. Shoes must be fully polished black leather with black socks.',
    'text', 1, true
  ),
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000001', 
    'Workplace Conduct & KSA Compliance', 
    '### Workplace Conduct & Compliance 

We operate in the Kingdom of Saudi Arabia, and our internal culture must reflect both international hospitality excellence and local traditions.

**Respectful Environment:**
* We maintain a zero-tolerance policy against harassment, bullying, or discrimination of any kind. 
* Mutual respect between team members, regardless of rank or department, is mandatory. A "Good morning" in the back-of-house corridors is the baseline of our culture.

**Time & Attendance:**
* You are expected to be in full uniform and clocked in AT your shift start time. This means you should arrive 15 minutes early to change and prepare.
* If you will be late due to an emergency, you must call your direct supervisor at least two hours prior to the shift start. DO NOT send a text or WhatsApp. 

**Phone Policy:**
* Personal mobile phones are wildly unacceptable in front-of-house guest areas. Phones must be left in your locker. Department heads will provide radios or duty devices if required for your role.',
    'text', 2, true
  ),
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000001', 
    'Knowledge Check', 'Please complete the final quiz to validate your understanding of HR Onboarding Essentials.', 
    'quiz', 3, true
  );
  UPDATE public.training_content_blocks SET content_data = jsonb_build_object('quiz_id', '63000000-0000-4000-8000-000000000001') WHERE title = 'Knowledge Check' AND training_module_id = '61000000-0000-4000-8000-000000000001';


  -- =========================================================================
  -- MODULE 3: Housekeeping Room Turnover (61000000-0000-4000-8000-000000000002)
  -- =========================================================================
  INSERT INTO public.training_content_blocks(id, training_module_id, title, content, type, "order", is_mandatory) VALUES
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000002', 
    'The 7-Step Cleaning Sequence', 
    '### The 7-Step Cleaning Sequence

Efficiency and absolute hygiene are the cornerstones of Housekeeping. Follow this sequence rigidly to avoid cross-contamination and save time:

1. **Air the Room:** Open the windows (if applicable), prop the door open, turn on all lights, and open the curtains. Report any burnt bulbs immediately.
2. **Clear the Trash & Linens:** Remove all garbage. Strip the bed entirely. Remove used towels from the bathroom. DO NOT place clean linens where dirty linens were.
3. **Make the Bed (Prime Standard):** Use the hospital-corner folding method. Ensure the duvet cover is taut, and the four pillows are perfectly aligned horizontally. 
4. **Bathroom Sanitation:** Apply chemical agents to the toilet and shower. Let them sit. Clean the vanity, mirrors, and floor. Return to scrub and rinse the toilet and shower. Discard your gloves!
5. **Dusting (Top to Bottom):** Work the room systematically clockwise from the door. Dust high surfaces first, ending at the nightstands and desk. 
6. **Replenish Amenities:** Restock the minibar, coffee pods, toiletries, and note pads exactly according to the floor blueprint layout.
7. **Vacuum & Final Check:** Vacuum starting from the farthest corner out to the door. Perform the "look back" check—stand at the door and scan for oddities for 10 seconds before locking up.',
    'text', 1, true
  ),
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000002', 
    'Lost and Found & DND Handling', 
    '### Lost and Found & Do Not Disturb (DND)

**Lost and Found Protocol:**
If you find ANY item left behind by a checked-out guest (a phone charger, a ring, or left-over clothing):
* DO NOT throw it away unless it is obviously perishable food.
* Immediately place the item in a sealed clear plastic bag.
* Attach a tag detailing: Room Number, Date, Time, and Your Name.
* Hand it to the Housekeeping Supervisor or Security within 30 minutes.

**Do Not Disturb (DND) Rules:**
* If a DND sign is on the door, **under no circumstances do you knock or enter.**
* Log the DND in your worksheet.
* If a room has been on DND for 24 continuous hours, you MUST alert the Duty Manager and Security. They will conduct a wellness check. Never bypass a 24-hour DND yourself.',
    'text', 2, true
  ),
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000002', 
    'Knowledge Check', 'Please complete the final quiz to validate your understanding of Housekeeping.', 
    'quiz', 3, true
  );
  UPDATE public.training_content_blocks SET content_data = jsonb_build_object('quiz_id', '63000000-0000-4000-8000-000000000002') WHERE title = 'Knowledge Check' AND training_module_id = '61000000-0000-4000-8000-000000000002';


  -- =========================================================================
  -- MODULE 4: Emergency Fire & Evacuation (61000000-0000-4000-8000-000000000003)
  -- =========================================================================
  INSERT INTO public.training_content_blocks(id, training_module_id, title, content, type, "order", is_mandatory) VALUES
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000003', 
    'Understanding the R.A.C.E. Protocol', 
    '### The R.A.C.E Protocol

In the event of discovering a fire, you must act instinctively. Memorize **R.A.C.E**:

* **R - Rescue:** Immediately assist anyone in immediate danger from the fire, if it does not put your own life at risk.
* **A - Alarm:** Pull the nearest manual fire pull-station and yell "Fire" to alert those nearby. Alert the operator/PBX via emergency extension.
* **C - Contain:** Close all doors behind you to starve the fire of oxygen and slow the spread of smoke. Do NOT lock them.
* **E - Extinguish/Evacuate:** If the fire is small (size of a trash can), use a nearby extinguisher. If it is larger, immediately evacuate via the nearest stairwell. NEVER USE THE ELEVATOR.

**Types of Extinguishers (P.A.S.S. Method):**
To use a fire extinguisher, remember **P.A.S.S**: Pull the pin, Aim at the base of the fire, Squeeze the handle, Sweep side to side.',
    'text', 1, true
  ),
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000003', 
    'Evacuation Roles & Guest Assembly', 
    '### Evacuation Procedures & Assembly Points

When a full evacuation alarm sounds, **guest panic is the biggest danger**. 

**Your Role in an Evacuation:**
1. **Stay Calm:** Maintain a strong, commanding, but calm voice. Say: *"Please walk quickly to the nearest stairwell. Leave your luggage. Do not use the elevators."*
2. **Sweep Your Area:** If you are a department manager or designated sweep, quickly check bathrooms and meeting rooms in your zone. Mark doors with a chalk "X" on the bottom corner to show they are empty.
3. **Escort to Assembly Points:** Guide guests outside the hotel to the designated primary Assembly Point (at least 300 meters away from the building). 
4. **Accountability:** Department heads must pull up the daily roster on Prime Connect and perform a headcount. Report missing staff to the Fire Command Center (usually manned by the General Manager and Security Chief).',
    'text', 2, true
  ),
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000003', 
    'Knowledge Check', 'Please complete the final quiz to validate your understanding of Fire protocols.', 
    'quiz', 3, true
  );
  UPDATE public.training_content_blocks SET content_data = jsonb_build_object('quiz_id', '63000000-0000-4000-8000-000000000003') WHERE title = 'Knowledge Check' AND training_module_id = '61000000-0000-4000-8000-000000000003';


  -- =========================================================================
  -- MODULE 5: IT Cybersecurity Awareness (61000000-0000-4000-8000-000000000004)
  -- =========================================================================
  INSERT INTO public.training_content_blocks(id, training_module_id, title, content, type, "order", is_mandatory) VALUES
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000004', 
    'Phishing & Digital Hygiene', 
    '### Phishing & Digital Hygiene at Prime Hotels

**What is Phishing?**
Phishing is when an attacker sends a fraudulent email designed to trick you into revealing sensitive information, such as your Prime Connect login or a guest''s credit card number.

**How to Spot a Phishing Attempt:**
* Does the email create a false sense of urgency? ("Urgent: HR Policy Update - Mandatory Action Required")
* Check the sender address carefully: `admin@prime-hotels.com` is legitimate. `admin@prime-hoteIs.com` (with a capital I) is NOT.
* Never click links from unknown senders. Forward suspicious emails to the IT Helpdesk immediately.

**Clean Desk Policy:**
When you step away from your workstation—even for 1 minute—you **must** lock your screen (Windows Key + L). Never leave guest folios, registration cards, or sticky notes with passwords on your desk.',
    'text', 1, true
  ),
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000004', 
    'Handling Sensitive Guest Data', 
    '### Handling Sensitive Guest Data (PCI-DSS & KSA Compliance)

**Credit Card Data (PCI-DSS Compliance):**
We process thousands of secure transactions daily. The Payment Card Industry Data Security Standard (PCI-DSS) dictates strict rules for our operations.
* **Never** write down a full 16-digit credit card number or CVV code on paper.
* **Never** request a guest to email you their credit card details. If a third-party needs to authorize a card, they must use the secure online payment gateway link. Provide them the link; do not accept card details over the phone or email.

**Physical Documents & Passports:**
* When scanning a guest passport or National ID into the PMS during check-in, ensure the physical document is immediately returned to the guest.
* Any printed reports containing guest names (like the VIP Arrivals List) must be completely shredded at the end of your shift. Do not throw them in standard recycling bins.',
    'text', 2, true
  ),
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000004', 
    'Knowledge Check', 'Please complete the final quiz to validate your understanding of Cybersecurity.', 
    'quiz', 3, true
  );
  UPDATE public.training_content_blocks SET content_data = jsonb_build_object('quiz_id', '63000000-0000-4000-8000-000000000004') WHERE title = 'Knowledge Check' AND training_module_id = '61000000-0000-4000-8000-000000000004';


  -- =========================================================================
  -- MODULE 6: Finance Cash Handling (61000000-0000-4000-8000-000000000005)
  -- =========================================================================
  INSERT INTO public.training_content_blocks(id, training_module_id, title, content, type, "order", is_mandatory) VALUES
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000005', 
    'Float Management & Drop Safes', 
    '### Float Management & Reconciling Cash

As a cashier (Front Office or F&B), your cash "float" is legally your responsibility during your shift.

**Beginning Your Shift:**
* Always count your bank alongside the preceding cashier in a secure location (not in front of guests).
* Verify that you have the exact starting amount (e.g., 5,000 SAR) and an appropriate mix of small denominations for making change.

**End of Shift Drop:**
* Reconcile your PMS or POS shift report against the physical cash in your drawer.
* Complete the Cash Drop Envelope. 
* All cash drops into the hotel drop-safe must physically be witnessed by a member of Security or a Duty Manager.
* Report any overage or shortage immediately to the Finance Controller. Do NOT try to "balance it out" with personal cash.',
    'text', 1, true
  ),
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000005', 
    'Night Audit Overview', 
    '### Understanding the Night Audit

The Night Audit is the critical bridge between operational days. It usually occurs between 2:00 AM and 4:00 AM. 

**Core Night Audit Functions:**
1. **Closing the Day:** Generating departmental reports and officially rolling the system date forward in the PMS (Opera).
2. **Reconciliation:** Ensuring that what the F&B POS systems (Micros) processed matches the room charges posted in the PMS.
3. **Room Rate Posting:** Automatically posting the nightly room and tax charges to all occupied rooms.
4. **No-Show Processing:** Charging the guaranteed first-night fee to guests who failed to arrive, and canceling their remaining nights.

Night auditors are the final line of defense against revenue leakage and must meticulously hunt down rogue postings or orphaned checks.',
    'text', 2, true
  ),
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000005', 
    'Knowledge Check', 'Please complete the quiz to validate your understanding of Cash Flow.', 
    'quiz', 3, true
  );
  UPDATE public.training_content_blocks SET content_data = jsonb_build_object('quiz_id', '63000000-0000-4000-8000-000000000005') WHERE title = 'Knowledge Check' AND training_module_id = '61000000-0000-4000-8000-000000000005';


  -- =========================================================================
  -- MODULE 7: Engineering PM Walkthrough (61000000-0000-4000-8000-000000000006)
  -- =========================================================================
  INSERT INTO public.training_content_blocks(id, training_module_id, title, content, type, "order", is_mandatory) VALUES
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000006', 
    'Executing the PM Sequence', 
    '### Executing the Preventive Maintenance (PM) Sequence

Preventive Maintenance is what separates a world-class luxury hotel from a deteriorating property. PMs are scheduled to catch issues before the guest ever notices them. 

**In-Room PM Routine (The 30-Point Check):**
* **HVAC Systems:** Removing the FCU cover, cleaning the drain pan to prevent leaks, vacuuming the coil, and replacing the filter. Test the thermostat calibration.
* **Plumbing:** Check all silicone seals around the bath and sink. Ensure the pop-up drain works smoothly without clogging. Listen for "running toilets" which bleed utility costs.
* **Electrical:** Test every single socket with a multimeter or tester plug. Check reading lights and master switches.
* **Cosmetic:** Note peeling wallpaper, chipped furniture varnish, or scuffed doors to schedule immediate carpentry or painting work.',
    'text', 1, true
  ),
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000006', 
    'Lockout/Tagout (LOTO) Safety Protocol', 
    '### Lockout/Tagout (LOTO) Safety Protocol

LOTO is a critical safety procedure to ensure that dangerous machines and power sources are properly shut off and are not started up again prior to the completion of maintenance work. The standard saves lives.

**Mandatory LOTO Steps:**
1. **Identify the Source:** Locate the main breaker panel, isolation valve, or switchboard.
2. **Apply the Lock:** Place the physical heavy-duty padlock on the breaker to prevent it from moving.
3. **Apply the Tag:** Attach your personalized, highly-visible danger tag specifying your name, department, date, and reason for the lockout. 
4. **Test the Isolation:** Attempt to turn on the equipment from the normal controls to securely verify it has zero energy. 
5. Only the person who placed the lock and tag is legally permitted to remove it once the repair is safely completed.',
    'text', 2, true
  ),
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000006', 
    'Knowledge Check', 'Please complete the final quiz to validate your understanding of facility maintenance.', 
    'quiz', 3, true
  );
  UPDATE public.training_content_blocks SET content_data = jsonb_build_object('quiz_id', '63000000-0000-4000-8000-000000000006') WHERE title = 'Knowledge Check' AND training_module_id = '61000000-0000-4000-8000-000000000006';


  -- =========================================================================
  -- MODULE 8: Security Incident Response (61000000-0000-4000-8000-000000000007)
  -- =========================================================================
  INSERT INTO public.training_content_blocks(id, training_module_id, title, content, type, "order", is_mandatory) VALUES
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000007', 
    'Scene Management & Evidence Preservation', 
    '### Scene Management & Evidence Preservation

The role of hotel security is to protect life, property, and the reputation of the organization. If an incident occurs (e.g., a theft, a slip-and-fall, or an altercation), you act as the initial responder before local authorities arrive.

**Scene Control Basics:**
1. **Secure the perimeter:** If a serious incident occurs in a public area, use stanchions, caution tape, or human presence to block off the area immediately to protect guest dignity and prevent contamination.
2. **Preserve electronic evidence:** Ensure the CCTV operator immediately pulls and locks the footage of the incident area. Save an un-tampered copy.
3. **Control access:** Do not allow staff (including managers) to tidy up or move objects from an accident scene until photos have been taken and reports are filed. If a guest fell on a wet floor, preserving the exact condition of the floor is vital to liability investigations.',
    'text', 1, true
  ),
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000007', 
    'De-Escalation Tactics & Factual Reporting', 
    '### De-Escalation & Factual Reporting

**Verbal De-Escalation:**
When confronting an aggressive or intoxicated individual:
* Maintain a generous physical distance (at least two arm lengths).
* Keep your hands visible, open, and resting near your waist—avoid crossing your arms or pointing fingers, which signals aggression.
* Lower your vocal tone. If the guest yells, speak softly and calmly. 
* Empathize without accepting liability: *"I understand you are frustrated, sir. Let me help you resolve this."*

**Writing a Factual Report:**
Security incident reports are legal documents that might be subpoenaed in court.
* Do **NOT** use subjective language or assumptions (e.g., *"The guest was obviously too drunk."*)
* DO use factual, observable statements (e.g., *"The guest had a strong odor of alcohol, slurred their words, and stumbled over the lobby chair."*)
* Document the time arrived on scene, time police/EMS were called, badge numbers of responding officers, and every action you specifically took.',
    'text', 2, true
  ),
  (
    gen_random_uuid(), '61000000-0000-4000-8000-000000000007', 
    'Knowledge Check', 'Please complete the final quiz to validate your understanding of Security incidents.', 
    'quiz', 3, true
  );
  UPDATE public.training_content_blocks SET content_data = jsonb_build_object('quiz_id', '63000000-0000-4000-8000-000000000007') WHERE title = 'Knowledge Check' AND training_module_id = '61000000-0000-4000-8000-000000000007';

  -- Final COMMIT is handled implicitly by the Supabase migration runner or raw execution tool.
END $$;

