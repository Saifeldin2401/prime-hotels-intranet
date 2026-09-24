-- generate_totp's call to hmac() failed when invoked transitively from
-- verify_mfa_code, which pins SET search_path TO 'public' -- pgcrypto
-- (and hmac()) lives in the 'extensions' schema, invisible under that
-- restricted search_path since generate_totp has no search_path of its
-- own and inherits the caller's. Schema-qualify the call directly so it
-- resolves regardless of caller search_path.
CREATE OR REPLACE FUNCTION public.generate_totp(p_secret_base32 text, p_at_time bigint DEFAULT extract(epoch from now())::bigint, p_time_step integer DEFAULT 30, p_digits integer DEFAULT 6)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  key_bytes bytea;
  counter bigint;
  counter_bytes bytea := '\x0000000000000000'::bytea;
  hmac_result bytea;
  offset_val integer;
  bin_code bigint;
  otp bigint;
  i integer;
  byte_val integer;
BEGIN
  key_bytes := public.base32_decode(p_secret_base32);
  counter := p_at_time / p_time_step;

  FOR i IN 0..7 LOOP
    byte_val := (counter >> ((7 - i) * 8)) & 255;
    counter_bytes := set_byte(counter_bytes, i, byte_val);
  END LOOP;

  hmac_result := extensions.hmac(counter_bytes, key_bytes, 'sha1');

  offset_val := get_byte(hmac_result, length(hmac_result) - 1) & 15;

  bin_code := ((get_byte(hmac_result, offset_val) & 127) << 24)
            | ((get_byte(hmac_result, offset_val + 1) & 255) << 16)
            | ((get_byte(hmac_result, offset_val + 2) & 255) << 8)
            | (get_byte(hmac_result, offset_val + 3) & 255);

  otp := bin_code % (10 ^ p_digits)::bigint;

  RETURN lpad(otp::text, p_digits, '0');
END;
$function$;
