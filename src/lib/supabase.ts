import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let _supabaseAdmin: SupabaseClient | null = null;

// Admin client for server-side operations (with secret key)
// Used for database operations that bypass RLS
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable');
  }
  if (!supabaseSecretKey) {
    throw new Error('Missing SUPABASE_SECRET_KEY environment variable');
  }
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}

// Re-export for backward compatibility
export { getSupabaseAdmin as getSupabaseServerClient };
