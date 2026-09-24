CREATE OR REPLACE FUNCTION public.verify_certificate(verification_code_param character varying)
 RETURNS TABLE(is_valid boolean, certificate_number character varying, recipient_name character varying, title character varying, certificate_type character varying, completion_date timestamp with time zone, expiry_date timestamp with time zone, status character varying, issued_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (c.status = 'active' AND (c.expiry_date IS NULL OR c.expiry_date > NOW())) as is_valid,
    c.certificate_number,
    c.recipient_name,
    c.title,
    c.certificate_type,
    c.completion_date,
    c.expiry_date,
    c.status,
    c.created_at as issued_at
  FROM certificates c
  WHERE upper(c.verification_code) = upper(verification_code_param)
     OR upper(c.certificate_number) = upper(verification_code_param);
END;
$function$;
