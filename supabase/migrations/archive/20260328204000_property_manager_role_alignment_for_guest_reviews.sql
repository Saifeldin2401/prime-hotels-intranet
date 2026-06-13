-- Ensure each active hotel has a property_manager role aligned with guest review ownership.

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('09199c10-808d-4629-a706-aa4ec9a20150'::uuid, 'property_manager'::public.app_role),
  ('d35c22a4-874c-4153-b25c-1f594fbd57c9'::uuid, 'property_manager'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;
