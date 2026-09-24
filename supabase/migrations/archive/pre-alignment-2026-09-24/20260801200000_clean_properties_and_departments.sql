-- ============================================================================
-- MIGRATION: clean_properties_and_departments
-- Consolidates duplicate hotel properties, re-links all child records (FKs),
-- sets standardized codes/cities/names, and populates bilingual department names.
-- ============================================================================

DO $$
DECLARE
  v_hq_id uuid := '37e3a84a-bf3d-4adf-b2ec-ad063244d25e';
  v_jed_hamra_id uuid := '59ce4b36-feb7-49af-a3c7-cc1c9786f712';
  v_jed_corniche_id uuid := 'cb5cd09d-e7b3-4e2d-bd40-35e431248cc3';
  v_ruh_hamra_id uuid := '32d0083a-442d-4ee4-ac42-184da5cc9df5';
  v_ruh_qurtuba_id uuid := 'dd5225a3-0687-44b0-b497-43fa3e08051b';

  -- Duplicate property IDs to merge into primary ones
  v_dup_jed_hamra uuid := '9c89d1ea-3636-42fc-9346-cc107fc6acaa';
  v_dup_jed_corniche uuid := '3f02906a-a003-4773-8c6a-c29fcf38d1a3';
  v_dup_ruh_hamra uuid := '82c913ae-dab8-45e2-8c11-7b8582738fa4';
  v_dup_ruh_qurtuba uuid := 'cdea621c-ab57-47f9-86c4-313a1b5a2c13';

  prop RECORD;
BEGIN
  -- 1. Re-link foreign keys from duplicate property IDs to primary property IDs
  -- user_properties
  UPDATE public.user_properties SET property_id = v_jed_hamra_id WHERE property_id = v_dup_jed_hamra;
  UPDATE public.user_properties SET property_id = v_jed_corniche_id WHERE property_id = v_dup_jed_corniche;
  UPDATE public.user_properties SET property_id = v_ruh_hamra_id WHERE property_id = v_dup_ruh_hamra;
  UPDATE public.user_properties SET property_id = v_ruh_qurtuba_id WHERE property_id = v_dup_ruh_qurtuba;

  -- profiles (primary_property_id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'primary_property_id') THEN
    UPDATE public.profiles SET primary_property_id = v_jed_hamra_id WHERE primary_property_id = v_dup_jed_hamra;
    UPDATE public.profiles SET primary_property_id = v_jed_corniche_id WHERE primary_property_id = v_dup_jed_corniche;
    UPDATE public.profiles SET primary_property_id = v_ruh_hamra_id WHERE primary_property_id = v_dup_ruh_hamra;
    UPDATE public.profiles SET primary_property_id = v_ruh_qurtuba_id WHERE primary_property_id = v_dup_ruh_qurtuba;
  END IF;

  -- rooms
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rooms') THEN
    UPDATE public.rooms SET property_id = v_jed_hamra_id WHERE property_id = v_dup_jed_hamra;
    UPDATE public.rooms SET property_id = v_jed_corniche_id WHERE property_id = v_dup_jed_corniche;
    UPDATE public.rooms SET property_id = v_ruh_hamra_id WHERE property_id = v_dup_ruh_hamra;
    UPDATE public.rooms SET property_id = v_ruh_qurtuba_id WHERE property_id = v_dup_ruh_qurtuba;
  END IF;

  -- housekeeping_tasks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'housekeeping_tasks') THEN
    UPDATE public.housekeeping_tasks SET property_id = v_jed_hamra_id WHERE property_id = v_dup_jed_hamra;
    UPDATE public.housekeeping_tasks SET property_id = v_jed_corniche_id WHERE property_id = v_dup_jed_corniche;
    UPDATE public.housekeeping_tasks SET property_id = v_ruh_hamra_id WHERE property_id = v_dup_ruh_hamra;
    UPDATE public.housekeeping_tasks SET property_id = v_ruh_qurtuba_id WHERE property_id = v_dup_ruh_qurtuba;
  END IF;

  -- budgets
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets') THEN
    UPDATE public.budgets SET property_id = v_jed_hamra_id WHERE property_id = v_dup_jed_hamra;
    UPDATE public.budgets SET property_id = v_jed_corniche_id WHERE property_id = v_dup_jed_corniche;
    UPDATE public.budgets SET property_id = v_ruh_hamra_id WHERE property_id = v_dup_ruh_hamra;
    UPDATE public.budgets SET property_id = v_ruh_qurtuba_id WHERE property_id = v_dup_ruh_qurtuba;
  END IF;

  -- invoices
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    UPDATE public.invoices SET property_id = v_jed_hamra_id WHERE property_id = v_dup_jed_hamra;
    UPDATE public.invoices SET property_id = v_jed_corniche_id WHERE property_id = v_dup_jed_corniche;
    UPDATE public.invoices SET property_id = v_ruh_hamra_id WHERE property_id = v_dup_ruh_hamra;
    UPDATE public.invoices SET property_id = v_ruh_qurtuba_id WHERE property_id = v_dup_ruh_qurtuba;
  END IF;

  -- crm_contracts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_contracts') THEN
    UPDATE public.crm_contracts SET property_id = v_jed_hamra_id WHERE property_id = v_dup_jed_hamra;
    UPDATE public.crm_contracts SET property_id = v_jed_corniche_id WHERE property_id = v_dup_jed_corniche;
    UPDATE public.crm_contracts SET property_id = v_ruh_hamra_id WHERE property_id = v_dup_ruh_hamra;
    UPDATE public.crm_contracts SET property_id = v_ruh_qurtuba_id WHERE property_id = v_dup_ruh_qurtuba;
  END IF;

  -- incidents
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incidents') THEN
    UPDATE public.incidents SET property_id = v_jed_hamra_id WHERE property_id = v_dup_jed_hamra;
    UPDATE public.incidents SET property_id = v_jed_corniche_id WHERE property_id = v_dup_jed_corniche;
    UPDATE public.incidents SET property_id = v_ruh_hamra_id WHERE property_id = v_dup_ruh_hamra;
    UPDATE public.incidents SET property_id = v_ruh_qurtuba_id WHERE property_id = v_dup_ruh_qurtuba;
  END IF;

  -- Delete departments linked to duplicate properties
  DELETE FROM public.departments WHERE property_id IN (v_dup_jed_hamra, v_dup_jed_corniche, v_dup_ruh_hamra, v_dup_ruh_qurtuba);

  -- Delete duplicate properties
  DELETE FROM public.properties WHERE id IN (v_dup_jed_hamra, v_dup_jed_corniche, v_dup_ruh_hamra, v_dup_ruh_qurtuba);

  -- 2. Update retained primary properties with clean standardized names & metadata
  UPDATE public.properties SET 
    name = 'PRIME Head Office', 
    property_code = 'PRIME-HQ', 
    city = 'Jeddah', 
    country = 'Saudi Arabia',
    address = 'Al Andalus District, Jeddah, Saudi Arabia',
    is_headquarters = true
  WHERE id = v_hq_id;

  UPDATE public.properties SET 
    name = 'PRIME Al Hamra Hotel Jeddah', 
    property_code = 'PRIME-JED-01', 
    city = 'Jeddah', 
    country = 'Saudi Arabia',
    address = 'Al Hamra District, Palestine Street, Jeddah, Saudi Arabia',
    is_headquarters = false
  WHERE id = v_jed_hamra_id;

  UPDATE public.properties SET 
    name = 'PRIME Al Corniche Hotel Jeddah', 
    property_code = 'PRIME-JED-02', 
    city = 'Jeddah', 
    country = 'Saudi Arabia',
    address = 'North Corniche Road, Jeddah, Saudi Arabia',
    is_headquarters = false
  WHERE id = v_jed_corniche_id;

  UPDATE public.properties SET 
    name = 'PRIME Al Hamra Hotel Riyadh', 
    property_code = 'PRIME-RUH-01', 
    city = 'Riyadh', 
    country = 'Saudi Arabia',
    address = 'King Abdullah Road, Al Hamra District, Riyadh, Saudi Arabia',
    is_headquarters = false
  WHERE id = v_ruh_hamra_id;

  UPDATE public.properties SET 
    name = 'Medhal Qurtuba by PRIME Hotels', 
    property_code = 'PRIME-RUH-02', 
    city = 'Riyadh', 
    country = 'Saudi Arabia',
    address = 'Qurtuba District, Eastern Ring Road, Riyadh, Saudi Arabia',
    is_headquarters = false
  WHERE id = v_ruh_qurtuba_id;

  -- Delete remaining old departments and rebuild standardized bilingual departments
  DELETE FROM public.departments;

  -- 3. Populate standardized 12 bilingual departments for each primary property
  FOR prop IN SELECT id FROM public.properties LOOP
    INSERT INTO public.departments (property_id, name, name_ar, is_active) VALUES
      (prop.id, 'Executive Office', 'المكتب التنفيذي', true),
      (prop.id, 'Front Office & Reception', 'المكاتب الأمامية والاستقبال', true),
      (prop.id, 'Housekeeping & Laundry', 'التدبير المنزلي والمغسلة', true),
      (prop.id, 'Food & Beverage', 'الأغذية والمشروبات', true),
      (prop.id, 'Kitchen & Culinary', 'المطبخ والطهي', true),
      (prop.id, 'Engineering & Maintenance', 'الهندسة والصيانة', true),
      (prop.id, 'Sales & Marketing', 'المبيعات والتسويق', true),
      (prop.id, 'Finance & Accounting', 'المالية والمحاسبة', true),
      (prop.id, 'Human Resources', 'الموارد البشرية', true),
      (prop.id, 'Security & Safety', 'الأمن والسلامة', true),
      (prop.id, 'IT & Technology', 'تقنية المعلومات', true),
      (prop.id, 'Reservations & Revenue', 'الحجوزات وإدارة الإيرادات', true);
  END LOOP;
END $$;
