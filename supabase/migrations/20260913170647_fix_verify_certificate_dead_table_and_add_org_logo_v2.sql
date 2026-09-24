
DROP FUNCTION IF EXISTS public.verify_certificate(character varying);

CREATE FUNCTION public.verify_certificate(verification_code_param character varying)
 RETURNS TABLE(is_valid boolean, certificate_number character varying, verification_code character varying, recipient_name character varying, title character varying, certificate_type character varying, completion_date timestamp with time zone, expiry_date timestamp with time zone, status character varying, issued_at timestamp with time zone, property_name text, department_name text, organization_name text, organization_logo_url text)
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
    h.name as property_name,
    d.name as department_name,
    o.name as organization_name,
    o.logo_url as organization_logo_url
  FROM certificates c
  LEFT JOIN hotels h ON h.id = COALESCE(c.hotel_id, c.property_id)
  LEFT JOIN departments d ON d.id = c.department_id
  LEFT JOIN organizations o ON o.id = c.organization_id
  WHERE upper(c.verification_code) = upper(verification_code_param);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.verify_certificate(character varying) TO anon, authenticated;
