import { createBrowserClient, type CookieOptions as SupabaseCookieOptions } from '@supabase/ssr';
import { getStorageKey } from '@/lib/supabase/storage';

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
}

type CookieOptions = {
  path?: string;
  maxAge?: number;
  sameSite?: 'lax' | 'strict' | 'none' | boolean;
  secure?: boolean;
};

function normalizeSameSite(value: CookieOptions['sameSite']) {
  if (value === 'lax' || value === 'strict' || value === 'none') {
    return value;
  }
  return 'lax';
}

function setCookie(name: string, value: string, options?: CookieOptions) {
  if (typeof document === 'undefined') return;
  let cookieStr = `${name}=${encodeURIComponent(value)}`;
  cookieStr += `; path=${options?.path || '/'}`;
  if (options?.maxAge) cookieStr += `; max-age=${options.maxAge}`;
  cookieStr += `; samesite=${normalizeSameSite(options?.sameSite)}`;
  if (options?.secure) cookieStr += `; secure`;
  document.cookie = cookieStr;
}

export function createClient() {
  const storageKey = getStorageKey();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        storageKey,
        storage: {
          getItem(key: string) {
            return getCookie(key);
          },
          setItem(key: string, value: string) {
            setCookie(key, value, { path: '/', sameSite: 'lax' });
          },
          removeItem(key: string) {
            setCookie(key, '', { path: '/', maxAge: 0, sameSite: 'lax' });
          },
        },
      },
      cookies: {
        getAll() {
          const cookies: { name: string; value: string }[] = [];
          if (typeof document !== 'undefined') {
            document.cookie.split('; ').forEach((cookie) => {
              const [name, ...rest] = cookie.split('=');
              if (name) {
                cookies.push({ name, value: decodeURIComponent(rest.join('=')) });
              }
            });
          }
          return cookies;
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options: SupabaseCookieOptions }>
        ) {
          if (typeof document !== 'undefined') {
            cookiesToSet.forEach(({ name, value, options }) => {
              setCookie(name, value, {
                path: options?.path || '/',
                maxAge: options?.maxAge,
                sameSite: options?.sameSite || 'lax',
                secure: options?.secure,
              });
            });
          }
        },
      },
      cookieOptions: {
        name: storageKey,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  );
}
