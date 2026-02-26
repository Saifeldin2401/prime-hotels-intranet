-- Integrate PMS Systems with existing properties and add automation

-- ============================================================================
-- 1. CREATE PMS SYSTEM ENTRIES FOR ALL EXISTING PROPERTIES
-- ============================================================================

-- Property 1: Medhal Qurtuba by Prime Hotels (Jeddah)
INSERT INTO pms_systems (property_id, pms_type, pms_name, sync_frequency, is_active)
SELECT 'e1514198-354f-45a4-845f-e568095110af', 'cloudbeds', 'Cloudbeds PMS', 'daily', true
WHERE NOT EXISTS (SELECT 1 FROM pms_systems WHERE property_id = 'e1514198-354f-45a4-845f-e568095110af');

-- Property 2: Prime Al Corniche Hotel Jeddah
INSERT INTO pms_systems (property_id, pms_type, pms_name, sync_frequency, is_active)
SELECT 'f2700cc1-032b-4273-8fe0-fd5d8e30e1c1', 'opera', 'Oracle Opera PMS', 'daily', true
WHERE NOT EXISTS (SELECT 1 FROM pms_systems WHERE property_id = 'f2700cc1-032b-4273-8fe0-fd5d8e30e1c1');

-- Property 3: Prime Al Hamra Hotel Jeddah
INSERT INTO pms_systems (property_id, pms_type, pms_name, sync_frequency, is_active)
SELECT '990b0b9e-faeb-49fd-9c90-5308d7515c18', 'mews', 'Mews PMS', 'daily', true
WHERE NOT EXISTS (SELECT 1 FROM pms_systems WHERE property_id = '990b0b9e-faeb-49fd-9c90-5308d7515c18');

-- Property 4: Prime Al Hamra Hotel Riyadh
INSERT INTO pms_systems (property_id, pms_type, pms_name, sync_frequency, is_active)
SELECT '136d5f19-10b7-46d4-be87-7b31d84b915d', 'local', 'Local PMS System', 'daily', true
WHERE NOT EXISTS (SELECT 1 FROM pms_systems WHERE property_id = '136d5f19-10b7-46d4-be87-7b31d84b915d');

-- Property 5: Prime Hotel - Main (Corporate/HQ)
INSERT INTO pms_systems (property_id, pms_type, pms_name, sync_frequency, is_active)
SELECT '739771e0-08ff-4e07-992f-d2be1770aa59', 'other', 'Corporate Consolidated', 'daily', true
WHERE NOT EXISTS (SELECT 1 FROM pms_systems WHERE property_id = '739771e0-08ff-4e07-992f-d2be1770aa59');

-- ============================================================================
-- 2. CREATE AUTOMATION TRIGGER FOR NEW PROPERTIES
-- ============================================================================

-- Function to automatically create PMS system entry when new property is added
CREATE OR REPLACE FUNCTION auto_create_pms_system()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a default PMS system entry for the new property
    INSERT INTO pms_systems (
        property_id,
        pms_type,
        pms_name,
        sync_frequency,
        is_active
    ) VALUES (
        NEW.id,
        'other',  -- Default to 'other' - can be updated by admin
        'Pending Configuration',
        'daily',
        true
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on properties table
DROP TRIGGER IF EXISTS trg_auto_create_pms_system ON properties;
CREATE TRIGGER trg_auto_create_pms_system
    AFTER INSERT ON properties
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_pms_system();

-- ============================================================================
-- 3. INSERT SAMPLE OPERATIONAL DATA FOR LAST 7 DAYS
-- ============================================================================

-- Generate sample occupancy data for all properties (last 7 days)
INSERT INTO daily_occupancy (property_id, business_date, rooms_available, rooms_sold, rooms_ooo, adults, children, no_shows, cancellations, walk_ins)
SELECT 
    p.id as property_id,
    d.business_date,
    CASE 
        WHEN p.name LIKE '%Corniche%' THEN 150
        WHEN p.name LIKE '%Qurtuba%' THEN 80
        WHEN p.name LIKE '%Hamra%Jeddah%' THEN 120
        WHEN p.name LIKE '%Hamra%Riyadh%' THEN 100
        ELSE 50
    END as rooms_available,
    FLOOR(RANDOM() * 40 + 50)::INTEGER as rooms_sold, -- 50-90 rooms
    FLOOR(RANDOM() * 5)::INTEGER as rooms_ooo,
    FLOOR(RANDOM() * 100 + 50)::INTEGER as adults,
    FLOOR(RANDOM() * 30)::INTEGER as children,
    FLOOR(RANDOM() * 5)::INTEGER as no_shows,
    FLOOR(RANDOM() * 8)::INTEGER as cancellations,
    FLOOR(RANDOM() * 10)::INTEGER as walk_ins
FROM properties p
CROSS JOIN (
    SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::DATE as business_date
) d
WHERE p.is_active = true
ON CONFLICT (property_id, business_date) DO UPDATE SET
    rooms_sold = EXCLUDED.rooms_sold,
    updated_at = now();

-- Generate sample revenue data for all properties (last 7 days)
INSERT INTO daily_revenue (property_id, business_date, room_revenue, fb_revenue, spa_revenue, other_revenue, rooms_sold, cash_collections, credit_collections, ar_collections)
SELECT 
    p.id as property_id,
    d.business_date,
    (FLOOR(RANDOM() * 50000 + 30000))::DECIMAL(12,2) as room_revenue, -- 30k-80k SAR
    (FLOOR(RANDOM() * 15000 + 5000))::DECIMAL(12,2) as fb_revenue,    -- 5k-20k SAR
    (FLOOR(RANDOM() * 5000 + 1000))::DECIMAL(12,2) as spa_revenue,    -- 1k-6k SAR
    (FLOOR(RANDOM() * 3000 + 500))::DECIMAL(12,2) as other_revenue,   -- 0.5k-3.5k SAR
    FLOOR(RANDOM() * 40 + 50)::INTEGER as rooms_sold,
    (FLOOR(RANDOM() * 20000 + 10000))::DECIMAL(12,2) as cash_collections,
    (FLOOR(RANDOM() * 40000 + 20000))::DECIMAL(12,2) as credit_collections,
    (FLOOR(RANDOM() * 10000 + 5000))::DECIMAL(12,2) as ar_collections
FROM properties p
CROSS JOIN (
    SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::DATE as business_date
) d
WHERE p.is_active = true
ON CONFLICT (property_id, business_date) DO UPDATE SET
    room_revenue = EXCLUDED.room_revenue,
    fb_revenue = EXCLUDED.fb_revenue,
    updated_at = now();

-- Generate market segment data
INSERT INTO market_segments (property_id, business_date, segment_code, segment_name, room_nights, revenue, guests)
SELECT 
    p.id,
    CURRENT_DATE,
    seg.code,
    seg.name,
    FLOOR(RANDOM() * 20 + 5)::INTEGER,
    (FLOOR(RANDOM() * 15000 + 5000))::DECIMAL(12,2),
    FLOOR(RANDOM() * 30 + 10)::INTEGER
FROM properties p
CROSS JOIN (
    VALUES 
        ('CORP', 'Corporate'),
        ('LEIS', 'Leisure'),
        ('GRPS', 'Groups'),
        ('OTA', 'Online Travel Agents'),
        ('GOVT', 'Government'),
        ('WALK', 'Walk-in')
) AS seg(code, name)
WHERE p.is_active = true
ON CONFLICT DO NOTHING;
;
