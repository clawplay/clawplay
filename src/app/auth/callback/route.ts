import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? '/';

  // Security: ensure next is a relative URL
  if (!next.startsWith('/')) {
    next = '/';
  }

  // Debug: log all cookies received
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  console.log(
    '[Callback] Received cookies:',
    allCookies.map((c) => c.name)
  );

  if (code) {
    const supabase = await createClient();
    const storageKey = (supabase.auth as unknown as { storageKey?: string }).storageKey;
    if (storageKey) {
      const verifierCookie = cookieStore.get(`${storageKey}-code-verifier`);
      console.log('[Callback] storageKey:', storageKey);
      console.log('[Callback] verifier cookie length:', verifierCookie?.value?.length ?? 0);
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('exchangeCodeForSession error:', error.message);
    }

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_error`);
}
