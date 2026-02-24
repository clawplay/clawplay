import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getStorageKey } from '@/lib/supabase/storage';

export async function createClient() {
  const cookieStore = await cookies();
  const storageKey = getStorageKey();

  const storage = {
    getItem(key: string) {
      const value = cookieStore.get(key)?.value ?? null;
      if (key.includes('code-verifier')) {
        console.log('[Storage] getItem', key, value ? 'hit' : 'miss');
      }
      return value;
    },
    setItem(key: string, value: string) {
      if (key.includes('code-verifier')) {
        console.log('[Storage] setItem', key, `len=${value.length}`);
      }
      cookieStore.set(key, value, { path: '/', sameSite: 'lax' });
    },
    removeItem(key: string) {
      if (key.includes('code-verifier')) {
        console.log('[Storage] removeItem', key);
      }
      cookieStore.set(key, '', { path: '/', maxAge: 0, sameSite: 'lax' });
    },
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        storageKey,
        storage,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
