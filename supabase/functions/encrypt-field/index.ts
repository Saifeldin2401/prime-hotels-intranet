import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getVaultSecret } from "../_shared/vault.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const binary = Array.from(bytes).map((byte) => String.fromCharCode(byte)).join('');
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // This is a generic encrypt/decrypt oracle -- there is no ownership or
    // record-level check on what's being encrypted/decrypted, only who is
    // calling. It currently has zero real callers in the frontend, so the
    // safest fix is to restrict it to admin roles rather than leave it open
    // to any authenticated user (which would let any staff member decrypt
    // arbitrary ciphertext with the single global FIELD_ENCRYPTION_KEY).
    // If this is ever wired to a real feature, it MUST additionally bind
    // decrypt access to the caller's actual authorization over the specific
    // record being decrypted -- a role check alone is not sufficient for a
    // free-form decryption oracle.
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['regional_admin', 'corporate_admin', 'super_admin']);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Admin permission required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, payload } = await req.json();
    
    if (!payload || typeof payload !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const rawKey = await getVaultSecret(serviceClient, 'FIELD_ENCRYPTION_KEY');

    if (!rawKey) {
      console.error('FIELD_ENCRYPTION_KEY vault secret is missing.');
      throw new Error('Encryption key not configured');
    }

    const enc = new TextEncoder();
    const dec = new TextDecoder();

    // Derive WebCrypto Key
    const importedKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(rawKey.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );

    if (action === 'encrypt') {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = enc.encode(payload);
      
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        importedKey,
        encoded
      );
      
      const encryptedData = {
        iv: uint8ArrayToBase64(iv),
        ciphertext: uint8ArrayToBase64(new Uint8Array(ciphertext))
      };
      
      return new Response(JSON.stringify({ result: encryptedData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (action === 'decrypt') {
      const { iv, ciphertext } = JSON.parse(payload);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToUint8Array(iv) },
        importedKey,
        base64ToUint8Array(ciphertext)
      );
      
      return new Response(JSON.stringify({ result: dec.decode(decrypted) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Encryption function error:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
