import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Redirect /?code=xxx to /auth/callback?code=xxx for PKCE flow
  if (pathname === '/' && searchParams.has('code')) {
    const code = searchParams.get('code')!;
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    url.searchParams.set('code', code);
    url.searchParams.set('next', '/');
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not add logic between createServerClient and supabase.auth.getUser()
  // A simple mistake could make it hard to debug random user logouts.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return supabaseResponse;
}
