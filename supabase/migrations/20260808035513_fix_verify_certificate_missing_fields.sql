-- Fix verify_certificate() RPC: it never returned verification_code, so the public
-- verification letterhead printed "undefined-ALTUS-KSA-SECURE" as the ledger hash.
-- Also add property_name/department_name via a simple join so the dead Property/Department
-- DetailItem blocks on the public VerifyCertificate page can render.
DROP FUNCTION IF EXISTS public.verify_certificate(character varying);

CREATE OR REPLACE FUNCTION public.verify_certificate(verification_code_param character varying)
 RETURNS TABLE(
    is_valid boolean,
    certificate_number character varying,
    verification_code character varying,
    recipient_name character varying,
    title character varying,
    certificate_type character varying,
    completion_date timestamp with time zone,
    expiry_date timestamp with time zone,
    status character varying,
    issued_at timestamp with time zone,
    property_name text,
    department_name text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    (c.status = 'active' AND (c.expiry_date IS NULL OR c.expiry_date > NOW())) as is_valid,
    c.certificate_number,
    c.verification_code,
    c.recipient_name,
    c.title,
    c.certificate_type,
    c.completion_date,
    c.expiry_date,
    c.status,
    c.created_at as issued_at,
    p.name as property_name,
    d.name as department_name
  FROM certificates c
  LEFT JOIN properties p ON p.id = c.property_id
  LEFT JOIN departments d ON d.id = c.department_id
  WHERE upper(c.verification_code) = upper(verification_code_param)
     OR upper(c.certificate_number) = upper(verification_code_param);
END;
$function$;

-- Preserve original grant state (PUBLIC/postgres/anon/authenticated/service_role all had EXECUTE
-- since this is a public unauthenticated verification page).
GRANT EXECUTE ON FUNCTION public.verify_certificate(character varying) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(character varying) TO postgres;
GRANT EXECUTE ON FUNCTION public.verify_certificate(character varying) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_certificate(character varying) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_certificate(character varying) TO service_role;
