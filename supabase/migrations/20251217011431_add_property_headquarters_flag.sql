-- Add is_headquarters flag to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_headquarters BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_code VARCHAR(20);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Set Prime Hotel - Main as headquarters
UPDATE properties SET is_headquarters = true WHERE name LIKE '%Main%';

-- Update other properties with location data from address
UPDATE properties SET city = 'Jeddah', country = 'Saudi Arabia' 
WHERE address ILIKE '%jeddah%';

UPDATE properties SET city = 'Riyadh', country = 'Saudi Arabia' 
WHERE address ILIKE '%riyadh%' OR name ILIKE '%riyadh%';

UPDATE properties SET city = 'Jeddah', country = 'Saudi Arabia' 
WHERE name ILIKE '%qurtuba%';;
