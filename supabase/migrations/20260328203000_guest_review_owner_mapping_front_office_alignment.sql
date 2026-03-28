-- Align guest review owner mappings with Front Office teams per hotel.
-- Head Office representation in this module is limited to Islam Mahrous.

BEGIN;

-- Rooms Manager -> Front Office owner per property
UPDATE public.property_review_owner_mappings
SET primary_profile_id = CASE property_id
  WHEN 'e1514198-354f-45a4-845f-e568095110af'::uuid THEN '09199c10-808d-4629-a706-aa4ec9a20150'::uuid
  WHEN 'f2700cc1-032b-4273-8fe0-fd5d8e30e1c1'::uuid THEN '3e1b0f78-cd54-4f4b-af75-7b811a1f3727'::uuid
  WHEN '990b0b9e-faeb-49fd-9c90-5308d7515c18'::uuid THEN '67cc8665-0dd0-4e5a-853c-bba9823b84fa'::uuid
  WHEN '136d5f19-10b7-46d4-be87-7b31d84b915d'::uuid THEN 'd35c22a4-874c-4153-b25c-1f594fbd57c9'::uuid
  ELSE primary_profile_id
END,
backup_profile_id = NULL,
updated_at = now()
WHERE responsibility_code = 'rooms_manager';

-- General Manager -> property manager where available, FO fallback otherwise
UPDATE public.property_review_owner_mappings
SET primary_profile_id = CASE property_id
  WHEN 'e1514198-354f-45a4-845f-e568095110af'::uuid THEN '09199c10-808d-4629-a706-aa4ec9a20150'::uuid
  WHEN 'f2700cc1-032b-4273-8fe0-fd5d8e30e1c1'::uuid THEN '6bce1b5d-2f9b-46b1-991d-cf0c95a4b222'::uuid
  WHEN '990b0b9e-faeb-49fd-9c90-5308d7515c18'::uuid THEN '6bce1b5d-2f9b-46b1-991d-cf0c95a4b222'::uuid
  WHEN '136d5f19-10b7-46d4-be87-7b31d84b915d'::uuid THEN 'd35c22a4-874c-4153-b25c-1f594fbd57c9'::uuid
  ELSE primary_profile_id
END,
backup_profile_id = NULL,
updated_at = now()
WHERE responsibility_code = 'general_manager';

-- Head Office owners in this module -> Islam Mahrous only
UPDATE public.property_review_owner_mappings
SET primary_profile_id = '21d0b0e8-78ed-4997-a91d-bea18246a52a'::uuid,
    backup_profile_id = NULL,
    updated_at = now()
WHERE responsibility_code IN ('area_general_manager', 'corporate_reputation_owner');

-- Sync currently open assignments to active owner mappings
UPDATE public.guest_review_assignments a
SET assignee_profile_id = prom.primary_profile_id,
    backup_profile_id = prom.backup_profile_id,
    updated_at = now()
FROM public.property_review_owner_mappings prom
WHERE a.property_id = prom.property_id
  AND a.responsibility_code::text = prom.responsibility_code::text
  AND prom.is_active = true
  AND a.status <> 'closed'
  AND (
    a.assignee_profile_id IS DISTINCT FROM prom.primary_profile_id
    OR a.backup_profile_id IS DISTINCT FROM prom.backup_profile_id
  );

COMMIT;
