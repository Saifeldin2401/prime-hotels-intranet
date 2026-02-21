BEGIN;

-- Expanded training module templates for wide hotel use cases.

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Front Office: Check-in & Checkout',
    'Complete workflow for arrivals and departures with exceptions and service recovery.',
    'skill',
    '{
        "sections": [
            {
                "title": "Overview & Objectives",
                "description": "Set expectations and outcomes.",
                "items": [
                    { "type": "text", "title": "Learning objectives", "content": "List 3-5 outcomes for this module.", "duration": 5 }
                ]
            },
            {
                "title": "Pre-Arrival Preparation",
                "description": "Confirm reservations and readiness.",
                "items": [
                    { "type": "text", "title": "Reservation checks", "content": "Outline verification steps, VIP flags, and special requests.", "duration": 6 },
                    { "type": "document_link", "title": "Pre-arrival checklist", "content": "Attach the checklist or SOP PDF.", "duration": 4 }
                ]
            },
            {
                "title": "Check-in Procedure",
                "description": "Standard guest arrival flow.",
                "items": [
                    { "type": "text", "title": "Step-by-step process", "content": "Provide the standard greeting, ID, payment, and key issuance steps.", "duration": 8 },
                    { "type": "video", "title": "System walkthrough", "content": "Add a PMS walkthrough video link.", "duration": 6 }
                ]
            },
            {
                "title": "Checkout & Exceptions",
                "description": "Payments, late checkout, disputes.",
                "items": [
                    { "type": "text", "title": "Checkout process", "content": "Describe express checkout, folio review, and feedback capture.", "duration": 6 },
                    { "type": "text", "title": "Exceptions handling", "content": "List policies for late checkout, disputes, and refunds.", "duration": 6 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Validate understanding.",
                "items": [
                    { "type": "quiz", "title": "Check-in/Checkout Quiz", "content": "Link or create a quiz for this module.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Front Office: Check-in & Checkout'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Housekeeping: Room Turnover SOP',
    'Standard room cleaning and inspection flow with quality checkpoints.',
    'skill',
    '{
        "sections": [
            {
                "title": "Standards Overview",
                "description": "Room readiness criteria.",
                "items": [
                    { "type": "text", "title": "Quality standards", "content": "Define clean-room criteria and presentation standards.", "duration": 5 }
                ]
            },
            {
                "title": "Turnover Workflow",
                "description": "Step-by-step cleaning sequence.",
                "items": [
                    { "type": "text", "title": "Cleaning steps", "content": "List tasks in order: strip, sanitize, restock, reset.", "duration": 10 },
                    { "type": "image", "title": "Amenity setup guide", "content": "Add visual guide images for setup standards.", "duration": 5 }
                ]
            },
            {
                "title": "Safety & Chemicals",
                "description": "Handling and PPE.",
                "items": [
                    { "type": "text", "title": "Chemical safety", "content": "Describe PPE, dilution, and storage rules.", "duration": 6 },
                    { "type": "sop_reference", "title": "MSDS/chemical SOP", "content": "Link to MSDS or policy reference.", "duration": 4 }
                ]
            },
            {
                "title": "Inspection & Handover",
                "description": "Final checks and reporting.",
                "items": [
                    { "type": "text", "title": "Inspection checklist", "content": "Document final inspection steps and defect reporting.", "duration": 6 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Confirm SOP comprehension.",
                "items": [
                    { "type": "quiz", "title": "Housekeeping SOP Quiz", "content": "Select a quiz from the question bank.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Housekeeping: Room Turnover SOP'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Food & Beverage: Food Safety & Hygiene',
    'Food handling, hygiene, storage, and HACCP controls.',
    'safety',
    '{
        "sections": [
            {
                "title": "Overview & Regulations",
                "description": "Local compliance and standards.",
                "items": [
                    { "type": "text", "title": "Regulatory overview", "content": "Summarize HACCP and local health authority rules.", "duration": 6 }
                ]
            },
            {
                "title": "Personal Hygiene",
                "description": "Handwashing, PPE, illness policy.",
                "items": [
                    { "type": "text", "title": "Hygiene standards", "content": "Define handwashing, glove use, and illness reporting.", "duration": 7 },
                    { "type": "video", "title": "Handwashing demo", "content": "Add a short training video.", "duration": 4 }
                ]
            },
            {
                "title": "Storage & Temperature",
                "description": "Receiving, labeling, and monitoring.",
                "items": [
                    { "type": "text", "title": "Storage rules", "content": "Explain FIFO, labeling, and temperature logs.", "duration": 7 },
                    { "type": "document_link", "title": "Temperature log sheet", "content": "Attach the official log sheet.", "duration": 4 }
                ]
            },
            {
                "title": "Cross-Contamination Control",
                "description": "Prevent risks.",
                "items": [
                    { "type": "text", "title": "Separation practices", "content": "Describe prep area separation and cleaning schedules.", "duration": 6 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Validate understanding.",
                "items": [
                    { "type": "quiz", "title": "Food Safety Quiz", "content": "Select or generate a quiz for staff.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Food & Beverage: Food Safety & Hygiene'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Engineering: Preventive Maintenance Walkthrough',
    'Routine checks, escalation, and documentation standards for engineering teams.',
    'skill',
    '{
        "sections": [
            {
                "title": "Scope & Objectives",
                "description": "What this maintenance covers.",
                "items": [
                    { "type": "text", "title": "Overview", "content": "Define assets, frequency, and service levels.", "duration": 5 }
                ]
            },
            {
                "title": "Pre-Check Requirements",
                "description": "Safety and tools.",
                "items": [
                    { "type": "text", "title": "Safety prep", "content": "List lockout/tagout, PPE, and tool checks.", "duration": 6 }
                ]
            },
            {
                "title": "Maintenance Steps",
                "description": "Step-by-step inspection.",
                "items": [
                    { "type": "text", "title": "Inspection workflow", "content": "Detail inspection points and acceptance criteria.", "duration": 10 },
                    { "type": "image", "title": "Inspection photos", "content": "Add sample photos or diagrams.", "duration": 5 }
                ]
            },
            {
                "title": "Reporting & Escalation",
                "description": "Logging and follow-up.",
                "items": [
                    { "type": "text", "title": "Documentation", "content": "Explain how to log work orders and escalate risks.", "duration": 6 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Confirm comprehension.",
                "items": [
                    { "type": "quiz", "title": "Maintenance SOP Quiz", "content": "Select or create a quiz.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Engineering: Preventive Maintenance Walkthrough'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Security: Incident Response & Reporting',
    'Critical response flow, documentation, and communication standards.',
    'safety',
    '{
        "sections": [
            {
                "title": "Incident Types",
                "description": "Classification and severity.",
                "items": [
                    { "type": "text", "title": "Incident categories", "content": "Define categories and escalation thresholds.", "duration": 6 }
                ]
            },
            {
                "title": "Response Protocol",
                "description": "Immediate actions and safety.",
                "items": [
                    { "type": "text", "title": "First response steps", "content": "Describe safety, containment, and communication steps.", "duration": 8 }
                ]
            },
            {
                "title": "Reporting",
                "description": "Documentation and evidence handling.",
                "items": [
                    { "type": "document_link", "title": "Incident report form", "content": "Attach the official report template.", "duration": 4 },
                    { "type": "text", "title": "Evidence handling", "content": "Explain chain of custody and storage rules.", "duration": 6 }
                ]
            },
            {
                "title": "Communication",
                "description": "Internal and external messaging.",
                "items": [
                    { "type": "text", "title": "Notification matrix", "content": "Detail who to notify at each severity level.", "duration": 5 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Validate readiness.",
                "items": [
                    { "type": "quiz", "title": "Incident Response Quiz", "content": "Pick a quiz from the bank.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Security: Incident Response & Reporting'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Guest Relations: Complaint Recovery',
    'Service recovery framework for front-line teams.',
    'skill',
    '{
        "sections": [
            {
                "title": "Service Recovery Framework",
                "description": "Define the recovery model.",
                "items": [
                    { "type": "text", "title": "Recovery steps", "content": "Outline acknowledge, apologize, resolve, follow-up.", "duration": 6 }
                ]
            },
            {
                "title": "Common Scenarios",
                "description": "Typical complaints and responses.",
                "items": [
                    { "type": "text", "title": "Scenario guidance", "content": "Provide standard responses for common issues.", "duration": 8 }
                ]
            },
            {
                "title": "Compensation Guidelines",
                "description": "When and how to offer recovery.",
                "items": [
                    { "type": "sop_reference", "title": "Comp policy", "content": "Link to compensation policy.", "duration": 4 }
                ]
            },
            {
                "title": "Practice",
                "description": "Role-play exercises.",
                "items": [
                    { "type": "interactive", "title": "Role-play prompt", "content": "Add a role-play or simulation link.", "duration": 10 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Confirm service recovery steps.",
                "items": [
                    { "type": "quiz", "title": "Guest Relations Quiz", "content": "Select a quiz.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Guest Relations: Complaint Recovery'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'HR: New Hire Onboarding Essentials',
    'Core onboarding information, policies, and expectations.',
    'onboarding',
    '{
        "sections": [
            {
                "title": "Welcome & Culture",
                "description": "Brand values and service promise.",
                "items": [
                    { "type": "text", "title": "Welcome message", "content": "Introduce the brand culture and values.", "duration": 5 }
                ]
            },
            {
                "title": "Policies & Compliance",
                "description": "Key policies new hires must know.",
                "items": [
                    { "type": "sop_reference", "title": "Code of conduct", "content": "Link to policy document.", "duration": 5 },
                    { "type": "document_link", "title": "Employee handbook", "content": "Attach the latest handbook.", "duration": 4 }
                ]
            },
            {
                "title": "Role Expectations",
                "description": "Key responsibilities and KPIs.",
                "items": [
                    { "type": "text", "title": "Job responsibilities", "content": "List role expectations and performance goals.", "duration": 6 }
                ]
            },
            {
                "title": "Tools & Systems",
                "description": "Systems access and usage.",
                "items": [
                    { "type": "video", "title": "Systems overview", "content": "Add a system orientation video.", "duration": 6 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Confirm onboarding comprehension.",
                "items": [
                    { "type": "quiz", "title": "Onboarding Quiz", "content": "Select a quiz for new hires.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'HR: New Hire Onboarding Essentials'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Finance: Cash Handling & Night Audit',
    'Cash management, reconciliation, and night audit flow.',
    'policy',
    '{
        "sections": [
            {
                "title": "Overview",
                "description": "Cash handling responsibilities.",
                "items": [
                    { "type": "text", "title": "Policy summary", "content": "Summarize cash handling rules and accountability.", "duration": 6 }
                ]
            },
            {
                "title": "Cash Handling Steps",
                "description": "Drawer, deposits, and approvals.",
                "items": [
                    { "type": "text", "title": "Step-by-step process", "content": "Define opening, drops, and handover procedures.", "duration": 8 },
                    { "type": "document_link", "title": "Cash log template", "content": "Attach the daily cash log.", "duration": 4 }
                ]
            },
            {
                "title": "Night Audit",
                "description": "End-of-day checks.",
                "items": [
                    { "type": "text", "title": "Audit checklist", "content": "List reports and reconciliation steps.", "duration": 7 }
                ]
            },
            {
                "title": "Exceptions & Escalation",
                "description": "Shortages, overages, and incidents.",
                "items": [
                    { "type": "text", "title": "Escalation rules", "content": "Define thresholds and escalation contacts.", "duration": 5 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Confirm understanding.",
                "items": [
                    { "type": "quiz", "title": "Cash Handling Quiz", "content": "Select a quiz.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Finance: Cash Handling & Night Audit'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'IT: Cybersecurity Awareness',
    'Phishing, password hygiene, device safety, and incident reporting.',
    'policy',
    '{
        "sections": [
            {
                "title": "Threat Overview",
                "description": "Common risks and impact.",
                "items": [
                    { "type": "text", "title": "Security risks", "content": "Explain phishing, malware, and data loss risks.", "duration": 6 }
                ]
            },
            {
                "title": "Safe Practices",
                "description": "Everyday controls.",
                "items": [
                    { "type": "text", "title": "Password hygiene", "content": "Define strong passwords and MFA usage.", "duration": 6 },
                    { "type": "text", "title": "Email safety", "content": "Describe how to spot phishing.", "duration": 6 }
                ]
            },
            {
                "title": "Device & Data Handling",
                "description": "Secure devices and data.",
                "items": [
                    { "type": "text", "title": "Device policy", "content": "Outline device lock, storage, and transfer rules.", "duration": 6 }
                ]
            },
            {
                "title": "Incident Reporting",
                "description": "What to do when something happens.",
                "items": [
                    { "type": "text", "title": "Report flow", "content": "Provide contacts and response steps.", "duration": 5 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Validate awareness.",
                "items": [
                    { "type": "quiz", "title": "Cybersecurity Quiz", "content": "Select a quiz.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'IT: Cybersecurity Awareness'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Emergency: Fire & Evacuation Procedures',
    'Evacuation routes, alarm response, and assembly points.',
    'safety',
    '{
        "sections": [
            {
                "title": "Emergency Overview",
                "description": "Fire safety goals and responsibilities.",
                "items": [
                    { "type": "text", "title": "Safety overview", "content": "Summarize emergency responsibilities and roles.", "duration": 6 }
                ]
            },
            {
                "title": "Alarm Response",
                "description": "Immediate actions.",
                "items": [
                    { "type": "text", "title": "Initial response", "content": "Define alarm response and communication steps.", "duration": 6 }
                ]
            },
            {
                "title": "Evacuation",
                "description": "Route and assembly procedures.",
                "items": [
                    { "type": "text", "title": "Evacuation routes", "content": "Provide route maps and assembly point guidance.", "duration": 8 },
                    { "type": "image", "title": "Evacuation map", "content": "Attach evacuation map images.", "duration": 4 }
                ]
            },
            {
                "title": "Post-Incident",
                "description": "Headcount and reporting.",
                "items": [
                    { "type": "text", "title": "Post-incident steps", "content": "Explain headcount, reporting, and debrief.", "duration": 5 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Confirm readiness.",
                "items": [
                    { "type": "quiz", "title": "Fire Safety Quiz", "content": "Select a quiz.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Emergency: Fire & Evacuation Procedures'
);

COMMIT;
