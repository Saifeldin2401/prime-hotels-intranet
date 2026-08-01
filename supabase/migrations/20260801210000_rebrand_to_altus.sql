-- ============================================================================
-- MIGRATION: rebrand_to_altus
-- Rebrands all company, property, and system references from PRIME / PHG to ALTUS.
-- ============================================================================

DO $$
BEGIN
  -- 1. Rebrand Companies table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    UPDATE public.companies SET 
      name = 'Altus Hospitality Group',
      name_ar = 'مجموعة ألتوس للفنادق والضيافة',
      code = 'ALTUS'
    WHERE code = 'PHG' OR name ILIKE '%prime%';
  END IF;

  -- 2. Rebrand Properties table
  UPDATE public.properties SET 
    name = 'ALTUS Head Office', 
    property_code = 'ALTUS-HQ' 
  WHERE property_code = 'PRIME-HQ' OR name ILIKE '%prime head office%';

  UPDATE public.properties SET 
    name = 'ALTUS Al Hamra Hotel Jeddah', 
    property_code = 'ALTUS-JED-01' 
  WHERE property_code = 'PRIME-JED-01' OR name ILIKE '%prime al hamra hotel jeddah%';

  UPDATE public.properties SET 
    name = 'ALTUS Al Corniche Hotel Jeddah', 
    property_code = 'ALTUS-JED-02' 
  WHERE property_code = 'PRIME-JED-02' OR name ILIKE '%prime al corniche hotel jeddah%';

  UPDATE public.properties SET 
    name = 'ALTUS Al Hamra Hotel Riyadh', 
    property_code = 'ALTUS-RUH-01' 
  WHERE property_code = 'PRIME-RUH-01' OR name ILIKE '%prime al hamra hotel riyadh%';

  UPDATE public.properties SET 
    name = 'Medhal Qurtuba by Altus Hotels', 
    property_code = 'ALTUS-RUH-02' 
  WHERE property_code = 'PRIME-RUH-02' OR name ILIKE '%medhal qurtuba by prime%';
END $$;
