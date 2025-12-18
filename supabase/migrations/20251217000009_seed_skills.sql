-- Seed skills data
INSERT INTO public.skills (name, category, description) VALUES
-- Front Office
('Guest Check-in/Check-out Standard', 'Front Office', 'Proficiency in the standard procedures for guest arrival and departure.'),
('Reservation Management', 'Front Office', 'Ability to create, modify, and manage room reservations using the PMS.'),
('Concierge Services', 'Front Office', 'Knowledge of local attractions, services, and guest assistance.'),
('Telephone Etiquette', 'Front Office', 'Professional communication standards for handling calls.'),
('Complaint Handling', 'Front Office', 'Techniques for resolving guest issues and service recovery.'),
('Night Audit Procedures', 'Front Office', 'End-of-day financial reconciliation and reporting.'),

-- Housekeeping
('Room Cleaning SOP', 'Housekeeping', 'Standard procedures for cleaning and preparing guest rooms.'),
('Bed Making & Linen Handling', 'Housekeeping', 'Techniques for making beds to hotel standards and handling linen.'),
('Bathroom Deep Cleaning', 'Housekeeping', 'Thorough cleaning and sanitization of guest bathrooms.'),
('Chemical Safety (COSHH)', 'Housekeeping', 'Safe handling and storage of cleaning chemicals.'),
('Public Area Maintenance', 'Housekeeping', 'Cleaning and upkeep of lobbies, corridors, and other public spaces.'),

-- Food & Beverage
('Table Setting & Etiquette', 'Food & Beverage', 'Proper arrangement of cutlery, glassware, and tableware.'),
('Wine Service', 'Food & Beverage', 'Presentation, opening, and pouring of wine.'),
('Food Safety (HACCP)', 'Food & Beverage', 'Hygiene practices and food safety regulations.'),
('Barista Skills', 'Food & Beverage', 'Preparation and service of coffee beverages.'),
('Mixology Basics', 'Food & Beverage', 'Fundamental cocktail preparation and bar service.'),
('Room Service Operations', 'Food & Beverage', 'Taking orders and delivering F&B to guest rooms.'),

-- Maintenance
('HVAC Troubleshooting', 'Maintenance', 'Basic diagnosis and repair of heating and cooling systems.'),
('Electrical Safety', 'Maintenance', 'Safe working practices with electrical systems.'),
('Plumbing Maintenance', 'Maintenance', 'Repairing leaks, drains, and bathroom fixtures.'),
('Pool & Spa Maintenance', 'Maintenance', 'Water quality testing and equipment upkeep.'),

-- Security
('Emergency Response', 'Security', 'Procedures for medical, fire, and security emergencies.'),
('Fire Safety', 'Security', 'Fire prevention, alarm response, and evacuation protocols.'),
('First Aid & CPR', 'Security', 'Basic life support-saving techniques.'),

-- Management / General
('Leadership Essentials', 'Management', 'Core skills for supervising and motivating teams.'),
('Time Management', 'Management', 'Effective prioritization and workflow management.'),
('Cultural Awareness', 'Management', 'Understanding and respecting diverse guest and staff backgrounds.')
ON CONFLICT (name) DO NOTHING;
