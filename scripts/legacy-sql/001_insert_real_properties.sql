-- Insert Real Altus Advisory Properties
INSERT INTO properties (name, address, is_active, created_at, updated_at) VALUES 
('Medhal Qurtuba by Altus Advisory', 'Riyadh, Saudi Arabia', true, NOW(), NOW()),
('Altus Al Corniche Hotel Jeddah', 'Jeddah, Saudi Arabia', true, NOW(), NOW()),
('Altus Al Hamra Hotel Jeddah', 'Jeddah, Saudi Arabia', true, NOW(), NOW()),
('Altus Al Hamra Hotel Riyadh', 'Riyadh, Saudi Arabia', true, NOW(), NOW()),
('ALTUS Head Office', '123 Hotel Street', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
