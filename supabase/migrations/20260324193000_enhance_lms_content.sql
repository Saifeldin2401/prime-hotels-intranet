begin;

-- Delete old training content blocks (both text and quizzes) for the specific expanded modules
-- to safely re-seed them with significantly more comprehensive and sophisticated material.
delete from public.training_content_blocks
where training_module_id in (
    '81000000-0000-4000-8000-000000000001'::uuid,
    '81000000-0000-4000-8000-000000000002'::uuid,
    '81000000-0000-4000-8000-000000000003'::uuid,
    '81000000-0000-4000-8000-000000000004'::uuid,
    '81000000-0000-4000-8000-000000000005'::uuid,
    '81000000-0000-4000-8000-000000000006'::uuid
);

-- Re-insert deeply comprehensive Training Content Blocks
insert into public.training_content_blocks (
  id, training_module_id, type, content, "order", created_at, content_data, is_mandatory, is_deleted, duration_seconds, points
)
select
  gen_random_uuid(), seed.module_id, seed.block_type::public.content_block_type, seed.content, seed.block_order, timezone('utc', now()),
  case when seed.block_type = 'quiz' then jsonb_build_object('quiz_id', seed.quiz_id::text) else '{}'::jsonb end,
  true, false, seed.duration_seconds, 15
from (
  values
    -- MODULE 1: Food Safety
    ('81000000-0000-4000-8000-000000000001'::uuid, 'text', '### The Temperature Danger Zone
The Temperature Danger Zone is the critical temperature range in which foodborne pathogens multiply most rapidly. In our properties, this zone is strictly defined as between **5°C and 60°C (41°F and 140°F)**.

**Key Storage Controls:**
- **Cold Holding & Storage**: Must be strictly maintained at or below 4°C. Freezers must hold at -18°C or lower. Check and log temperatures every 4 hours.
- **Hot Holding**: Must be held at or above 60°C until served to the guest. 
- **The Cooling Process (Two-Stage Cooling)**: Cooked foods must be cooled from 60°C to 21°C within 2 hours, and then from 21°C to 5°C within another 4 hours. Use blast chillers or ice baths to accelerate this process.
- **Thawing**: Never thaw foods at room temperature. Use a designated thawing fridge (below 4°C), under running cold water, or as part of the cooking process.

Failure to respect these zones immediately compromises guest safety and violates our core enterprise standards.', 1, null::uuid, 900),
    ('81000000-0000-4000-8000-000000000001'::uuid, 'text', '### Cross Contamination & Personal Hygiene
Pathogens do not move themselves; they rely on vehicles. The most common vehicles in our kitchens are hands, equipment, and cleaning cloths.

**Equipment Separation Protocol:**
- **Color-Coded Boards**: Red for raw meat, Blue for raw fish, Green for washed vegetables, Yellow for poultry, White for dairy/bakery. Never cross these streams.
- **Sanitization**: All surfaces must be washed, rinsed, and sanitized using approved quaternary or chlorine solutions. 

**Personal Hygiene Mandates:**
- **Handwashing Protocol**: Wash hands with warm soapy water for a minimum of 20 seconds. Scrub under nails and up to the forearms. Hands MUST be washed after handling raw products, touching the face, smoking, or returning to the kitchen.
- **Glove Usage**: Gloves are an addition to, not a replacement for, handwashing. You must wash hands before donning gloves and immediately change gloves between different tasks.
- **Illness Reporting**: You are legally and ethically required to report to your manager if you experience symptoms including vomiting, diarrhea, jaundice, or fever. You will be reassigned away from food handling.', 2, null::uuid, 900),
    ('81000000-0000-4000-8000-000000000001'::uuid, 'quiz', 'Complete the food safety assessment', 3, '83000000-0000-4000-8000-000000000001'::uuid, 120),
    
    -- MODULE 2: Table Service
    ('81000000-0000-4000-8000-000000000002'::uuid, 'text', '### The 10-Step Sequence of Luxury Service
Precision and invisible choreography separate premium dining from average service. Memorize and execute these steps on every single table:

1. **Greeting & Seating**: Welcome the guest within 30 seconds. Pull out chairs, offer to assist with coats, unfold the napkin.
2. **Water & Beverage Service**: Offer still or sparkling water immediately. Take initial aperitif or cocktail orders. 
3. **Menu Presentation**: Present the menu open, ladies first. Enthusiastically highlight the Chef’s specials and check for dietary restrictions immediately.
4. **Order Taking**: Write down orders moving clockwise. Use pivot points to ensure food is never "auctioned" at the table.
5. **Course Delivery**: Serve from the **left** with the left hand. For larger tables, organize "swarm" or synchronized service so everyone receives their dish simultaneously.
6. **The 2-Bite Check**: Silently approach the table exactly when they have taken 2 bites. Ask a specific question like "Is the steak prepared perfectly to your liking?" rather than a generic "Is everything okay?".
7. **Clearing**: Clear empty plates from the **right** with the right hand. Never stack plates heavily on the table. Only clear when all guests have finished the course.
8. **Dessert & Escoffier**: Clear side plates and crumb the table. Present dessert and digestif menus automatically.
9. **The Bill**: Present the bill promptly upon request, in a clean folder, placed discreetly toward the host.
10. **Farewell**: Provide a warm, personalized farewell. "Thank you for joining us, Mr. Smith, we look forward to seeing you tomorrow."', 1, null::uuid, 1200),
    ('81000000-0000-4000-8000-000000000002'::uuid, 'text', '### The Psychology of Upselling
Upselling is often completely misunderstood. It is not about aggressively pushing the most expensive item on the menu. True luxury upselling is about enhancing the guest’s dining experience through expert recommendations and anticipation.

**Effective Techniques:**
- **The Pairing Strategy**: When a guest orders a specific dish, confidently recommend its ideal pairing. "That Ribeye is spectacular tonight. May I recommend a glass of the robust Cabernet from the Napa Valley to complement it?"
- **Detailed Descriptions**: Do not just say "We have tiramisu." Say, "Our pastry chef prepares a traditional Venetian Tiramisu with single-origin espresso and imported mascarpone." Words drive appetite.
- **The Presumptive Close for Dessert**: Avoid asking closed questions like "Do you want dessert?" Instead, hand them the menu and say, "Would you like me to bring a round of espressos while you look over our freshly made desserts?"
- **Water Upselling**: Never default to tap water. Start the experience with: "May I offer you some Acqua Panna or San Pellegrino for the table?"', 2, null::uuid, 1200),
    ('81000000-0000-4000-8000-000000000002'::uuid, 'quiz', 'Complete the table service assessment', 3, '83000000-0000-4000-8000-000000000002'::uuid, 120),
    
    -- MODULE 3: Brand Standards
    ('81000000-0000-4000-8000-000000000003'::uuid, 'text', '### Our Core Brand Identity & Voice
Our brand is built upon three non-negotiable pillars: **Authentic Luxury, Local Heritage, and Intuitive Service**. Whether you are drafting a sales proposal, conducting a site inspection, or responding to an email, these elements must echo throughout.

**Brand Voice Guidelines:**
- **Refined Vocabulary**: Eliminate casual slang from professional correspondence. Replace "Okay" with "Certainly", replace "No problem" with "It is my pleasure", and avoid starting sentences with "Unfortunately".
- **Visual & Formatting Consistency**: All collateral (proposals, menus, floor plans) must strictly adhere to the corporate Brand Book. Use our official Navy and Gold palette, corporate typography, and approved high-resolution imagery. Never download low-quality images from Google for a client presentation.
- **The 30-Second Elevator Pitch**: Every sales executive must master pitching our property effortlessly. Focus deeply on our Unique Selling Propositions (USPs) rather than generic facts. Instead of "We have 300 rooms and a pool," use "We offer an urban oasis featuring the city’s largest lagoon pool, providing exclusive retreat experiences while being only 5 minutes from the financial district."', 1, null::uuid, 900),
    ('81000000-0000-4000-8000-000000000003'::uuid, 'text', '### Mastering the Competitive Set (Comp Set)
To sell our hotel effectively, you must understand exactly who we are competing against, and more importantly, how we outmaneuver them.

**Analyzing the Landscape:**
- **Identify the Comp Set**: Look closely at our STR Comp Set. Who are the 4-5 properties competing for our exact market share? (e.g., The historic luxury hotel downtown, the modern convention hotel).
- **SWOT Analysis against Competitors**: Where are they weak? If the main competitor has limited natural light in their meeting spaces, highlight our floor-to-ceiling ballroom windows constantly during pitches.
- **Handling Price Rejections**: When a client says "Hotel X is offering $50 cheaper per room," never immediately drop your rate. Pivot the conversation to **Total Value**.
  - *Response Strategy*: "While their base rate is lower, our contracted rate includes premium high-speed Wi-Fi throughout the meeting floors, complimentary valet for VIPs, and we do not charge extraneous resort fees. When utilizing our venue, your actual total spend on the event will be significantly more optimized, while delivering a superior experience for your attendees."', 2, null::uuid, 900),
    ('81000000-0000-4000-8000-000000000003'::uuid, 'quiz', 'Complete the brand standards assessment', 3, '83000000-0000-4000-8000-000000000003'::uuid, 120),
    
    -- MODULE 4: Corporate Contracting
    ('81000000-0000-4000-8000-000000000004'::uuid, 'text', '### Yield Mechanics & Last Room Availability (LRA)
Corporate Sales is not just about signing accounts; it is about protecting the hotel''s yield strategy. Understanding LRA is absolutely critical.

**The Concept of Last Room Availability (LRA)**:
When a contract includes LRA, it guarantees the client that as long as the hotel has a standard room available for sale to the public (even during city-wide sell-out periods), the client can book that room at their heavily discounted corporate rate.
- **Why it matters**: If our rack rate jumps to $600 during a major event, but a corporate client has a $200 LRA rate, we lose $400 in potential revenue.
- **Strategic Deployment**: LRA should be reserved strictly for Top Tier accounts (Tier 1) that continuously produce massive, reliable volume globally (e.g., major consulting firms producing 1,000+ room nights).
- **Non-Last Room Availability (NLRA)**: For smaller, more sensitive accounts, always push for NLRA. This mechanism allows the Revenue Manager to "close out" the discounted corporate rate during peak periods or compression dates, forcing those guests to pay the Best Available Rate (BAR) or preventing dilution.', 1, null::uuid, 1200),
    ('81000000-0000-4000-8000-000000000004'::uuid, 'text', '### Negotiation Strategies & Account Reviews
In hospitality sales, every concession given must have a corresponding commitment received. 

**The Trade-Off Matrix:**
Never concede on price in isolation. If a travel manager is pushing aggressively for a 10% rate reduction:
- Demand a commitment to an increased room night volume (e.g., from 300 to 500 nights).
- Ask for "Preferred Status" on their booking tool, effectively blocking our competitors.
- Ask to secure their Q3 annual conference piece of business as part of the package.
Always trade, never just drop the rate.

**Quarterly Business Reviews (QBRs)**:
Corporate relationships require active management, not passive hope. Hold QBRs with all key decision-makers.
- **Data to Review**: Actualized production vs. committed production. Rejection rates (did they try to book but we were full?). Cancellation ratios.
- **The Underperforming Account Protocol**: If an account is severely underperforming its volume commitment by Q3, you are obligated to renegotiate the rate structure for the subsequent year or strip their LRA privileges. Data drives emotionless, effective sales decisions.', 2, null::uuid, 1200),
    ('81000000-0000-4000-8000-000000000004'::uuid, 'quiz', 'Complete the corporate contracting assessment', 3, '83000000-0000-4000-8000-000000000004'::uuid, 120),
    
    -- MODULE 5: P&L
    ('81000000-0000-4000-8000-000000000005'::uuid, 'text', '### The Anatomy of a Hotel Profit & Loss Statement (P&L)
Every manager, regardless of department, must understand how their schedule and purchasing decisions impact the overall financial health of the property. The P&L tells the story of our operational efficiency.

**Structure of the P&L (USALI standard):**
1. **Operated Departments**: These are revenue-generating departments (Rooms, F&B, Spa, Golf). They log both their direct revenues and their direct expenses (payroll, cost of sales, supplies). The remainder is Departmental Profit.
2. **Undistributed Operating Expenses**: These departments support the entire hotel but do not generate direct revenue (Sales & Marketing, Engineering/Maintenance, Human Resources, Finance). They are pure expense centers.
3. **Gross Operating Profit (GOP)**: 
   - **Formula**: Total Departmental Profits MINUS Total Undistributed Expenses.
   - **Why It Matters**: GOP is the ultimate scoreboard for the operational management team. It measures how effectively the Executive Committee and Department Heads operated the asset before fixed costs (like property taxes, owner debt service, and building insurance) that we cannot control are deducted.', 1, null::uuid, 1200),
    ('81000000-0000-4000-8000-000000000005'::uuid, 'text', '### Advanced Financial Ratios: Flow-Through & CPOR
Moving beyond basic budget variances requires understanding exactly how expenses react to changes in revenue volume.

**Cost Per Occupied Room (CPOR)**:
- A crucial metric for Housekeeping and Rooms Division. If house profit drops, look at CPOR. Are we spending $18 in guest supplies per occupied room when the budget is $12? Why? Monitor amenities closely.

**The Concept of Flow-Through (or Retention)**:
Flow-through measures the efficiency of managing revenue fluctuations down to the GOP line.
- **Positive Example (Riding the Wave)**: Total Revenue beats budget by $100k. GOP beats budget by $60k. The Flow-through is 60%. This is excellent; management effectively controlled variable costs while revenues surged, dropping 60 cents of every extra dollar straight to profit.
- **Negative Example (Missing the Drop)**: Total Revenue misses budget by $50k. However, the GOP misses budget by a catastrophic $80k. Negative flow-through. The management team failed to read the forecast, bringing in excess labor and ignoring purchasing controls despite the lower volume of guests.
As a leader, you must flex your expenses dynamically to match the actual reality of the hotel occupancy.', 2, null::uuid, 1200),
    ('81000000-0000-4000-8000-000000000005'::uuid, 'quiz', 'Complete the P&L reading assessment', 3, '83000000-0000-4000-8000-000000000005'::uuid, 120),
    
    -- MODULE 6: Crisis
    ('81000000-0000-4000-8000-000000000006'::uuid, 'text', '### The Golden Hour & Command Center Protocol
In a major crisis (fire, severe injury, security threat, natural disaster), the first 60 minutes—known as the Golden Hour—will irrevocably dictate the success of the outcome. Hesitation is not an option.

**Immediate Leadership Actions:**
1. **Life Safety is Paramount**: Initiate immediate emergency response procedures (evacuations, lockdown, contacting EMS). Property damage is secondary.
2. **Activate the Incident Response Team (IRT)**: The GM, Security Director, Chief Engineer, and PR Director must assemble instantly.
3. **Establish the Command Center**: Move operations to an isolated room away from public view (e.g., Executive Boardroom). It must be equipped with master plans, uninterrupted communications, and external access lines.
4. **Secure the Scene & Protect Evidence**: Post physical guards to block entry to the incident zone. This is vital for later police, fire, or insurance investigations. No scene should be cleaned or altered unless necessary for immediate life safety.', 1, null::uuid, 1500),
    ('81000000-0000-4000-8000-000000000006'::uuid, 'text', '### Controlling the Narrative & Holding Statements
You cannot hide a crisis. In an era where every guest has a smartphone, live streams to social media will begin within 2 minutes of an alarm. If you remain silent, rumors, panic, and journalists will fill the void. Our brand must be the definitive source of truth.

**Deploying the Holding Statement:**
A holding statement is a fast, pre-approved message issued to the press and public confirming that we recognize the incident but are still gathering facts. It buys time without accepting liability.
- **Sample Statement**: *"We can confirm that an incident occurred at the [Hotel Name] at approximately [Time]. Our absolute priority right now is ensuring the immediate safety and well-being of our guests and employees. We are cooperating fully with local emergency services on-site. We will provide verified updates as soon as more information becomes available."*

**The 5 Rules of Media Encounters:**
1. **Never say "No Comment"**: It invariably implies guilt or obfuscation. Say, "We are still actively gathering verified facts."
2. **Never Speculate**: Stick violently to the confirmed truth. Do not hypothesize about "why" the fire started.
3. **Radiate Empathy**: Remember the human element. "Our sincere thoughts are with those impacted."
4. **Assume Zero Blame**: Never assign blame to an employee, a contractor, or the hotel on record before an official investigation completes.
5. **Enforce the Single Spokesperson Rule**: Only the GM or Corporate PR speaks. Staff must refer all microphones away politely: *"Our General Manager will issue an official briefing shortly."*', 2, null::uuid, 1500),
    ('81000000-0000-4000-8000-000000000006'::uuid, 'quiz', 'Complete the Crisis Leadership assessment', 3, '83000000-0000-4000-8000-000000000006'::uuid, 120)
) as seed(module_id, block_type, content, block_order, quiz_id, duration_seconds);

commit;
