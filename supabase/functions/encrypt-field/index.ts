import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getVaultSecret } from "../_shared/vault.ts";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
