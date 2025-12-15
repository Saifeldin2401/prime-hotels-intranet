-- Insert Real Prime Hotels Properties
INSERT INTO properties (name, address, is_active, created_at, updated_at) VALUES 
('Medhal Qurtuba by Prime Hotels', 'Riyadh, Saudi Arabia', true, NOW(), NOW()),
('Prime Al Corniche Hotel Jeddah', 'Jeddah, Saudi Arabia', true, NOW(), NOW()),
('Prime Al Hamra Hotel Jeddah', 'Jeddah, Saudi Arabia', true, NOW(), NOW()),
('Prime Al Hamra Hotel Riyadh', 'Riyadh, Saudi Arabia', true, NOW(), NOW()),
('Prime Hotel - Main', '123 Hotel Street', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
